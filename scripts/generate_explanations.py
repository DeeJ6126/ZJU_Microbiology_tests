from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
QUESTION_BANK_PATH = PROJECT_ROOT / "public" / "question-bank.json"
DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DEFAULT_MODEL = "qwen3.5-122b-a10b"
OPTION_KEYS = ("A", "B", "C", "D")
SCOPED_CHAPTER_IDS = {
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    19,
    20,
    21,
    22,
    23,
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate AI explanations for question-bank.json with DashScope.",
    )
    parser.add_argument("--input", default=str(QUESTION_BANK_PATH))
    parser.add_argument("--output", default=str(QUESTION_BANK_PATH))
    parser.add_argument("--model", default=os.getenv("DASHSCOPE_MODEL") or DEFAULT_MODEL)
    parser.add_argument("--url", default=DASHSCOPE_URL)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--sleep", type=float, default=0.35)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--all-chapters", action="store_true")
    args = parser.parse_args()

    api_key = get_dashscope_key()

    if not api_key and not args.dry_run:
        raise SystemExit(
            "Missing DASHSCOPE_API_KEY_BIOLOGY or DASHSCOPE_API_KEY environment variable."
        )

    input_path = Path(args.input)
    output_path = Path(args.output)
    bank = json.loads(input_path.read_text(encoding="utf-8"))
    pending_questions = [
        question
        for question in bank["questions"]
        if args.all_chapters or question["chapterId"] in SCOPED_CHAPTER_IDS
    ]
    pending_questions = [
        question
        for question in pending_questions
        if args.force or not question.get("aiExplanation")
    ]

    if args.limit is not None:
        pending_questions = pending_questions[: args.limit]

    print(
        f"Explanation generation target: {len(pending_questions)} questions "
        f"(force={args.force}, model={args.model}, "
        f"scope={'all' if args.all_chapters else 'scoped'})."
    )

    if args.dry_run:
        for question in pending_questions[: min(3, len(pending_questions))]:
            print(question["id"], question["prompt"])
        return

    if not pending_questions:
        print("No pending questions to process.")
        return

    generated_count = 0
    processed_count = 0
    failed_ids: set[str] = set()
    started_at = time.perf_counter()
    total_questions = len(pending_questions)
    total_batches = len(list(chunked(pending_questions, args.batch_size)))

    render_progress(
        processed_count=processed_count,
        total_questions=total_questions,
        generated_count=generated_count,
        failed_count=len(failed_ids),
        current_batch=0,
        total_batches=total_batches,
        started_at=started_at,
    )

    for batch_index, batch in enumerate(chunked(pending_questions, args.batch_size), start=1):
        print_progress_message(f"[batch {batch_index}] requesting {len(batch)} explanations...")

        try:
            explanations = request_batch_explanations(
                api_key=api_key,
                url=args.url,
                model=args.model,
                questions=batch,
            )
        except Exception as batch_error:
            print_progress_message(f"[batch {batch_index}] batch failed: {batch_error}")
            explanations = request_questions_one_by_one(
                api_key=api_key,
                url=args.url,
                model=args.model,
                questions=batch,
                failed_ids=failed_ids,
            )

        explanation_by_id = {
            explanation["questionId"]: explanation for explanation in explanations
        }

        for question in batch:
            explanation = explanation_by_id.get(question["id"])

            if not explanation:
                failed_ids.add(question["id"])
                continue

            question["aiExplanation"] = {
                "model": args.model,
                "generatedAt": datetime.now().isoformat(),
                "explanation": explanation["explanation"],
                "optionExplanations": explanation["optionExplanations"],
                "confidence": explanation["confidence"],
            }
            generated_count += 1

        processed_count += len(batch)
        write_question_bank(bank, output_path)
        render_progress(
            processed_count=processed_count,
            total_questions=total_questions,
            generated_count=generated_count,
            failed_count=len(failed_ids),
            current_batch=batch_index,
            total_batches=total_batches,
            started_at=started_at,
        )
        time.sleep(args.sleep)

    if failed_ids:
        print()
        print("Some questions failed and were left without explanations:")
        for question_id in sorted(failed_ids):
            print(f"- {question_id}")

    print()
    print(f"Done. Generated explanations: {generated_count}. Output: {output_path}")


def get_dashscope_key() -> str:
    return (
        os.getenv("DASHSCOPE_API_KEY_BIOLOGY")
        or os.getenv("DASHSCOPE_API_KEY")
        or get_windows_environment_value("DASHSCOPE_API_KEY_BIOLOGY")
        or get_windows_environment_value("DASHSCOPE_API_KEY")
        or ""
    )


def get_windows_environment_value(name: str) -> str:
    if os.name != "nt":
        return ""

    try:
        import winreg

        for root, subkey in (
            (winreg.HKEY_CURRENT_USER, "Environment"),
            (
                winreg.HKEY_LOCAL_MACHINE,
                r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment",
            ),
        ):
            try:
                with winreg.OpenKey(root, subkey) as key:
                    value, _ = winreg.QueryValueEx(key, name)
                    return str(value)
            except FileNotFoundError:
                continue
            except OSError:
                continue
    except Exception:
        return ""

    return ""


def request_questions_one_by_one(
    *,
    api_key: str,
    url: str,
    model: str,
    questions: list[dict[str, Any]],
    failed_ids: set[str],
) -> list[dict[str, Any]]:
    explanations: list[dict[str, Any]] = []

    for question in questions:
        try:
            explanations.extend(
                request_batch_explanations(
                    api_key=api_key,
                    url=url,
                    model=model,
                    questions=[question],
                )
            )
            time.sleep(0.25)
        except Exception as question_error:
            print_progress_message(f"[{question['id']}] failed: {question_error}")
            failed_ids.add(question["id"])

    return explanations


def request_batch_explanations(
    *,
    api_key: str,
    url: str,
    model: str,
    questions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a careful microbiology teaching assistant. "
                    "Generate concise Chinese explanations for multiple-choice questions. "
                    "The explanation MUST support the provided answerKey. "
                    "Do not change the answer. If a distractor can look plausible, explain why it is not the best answer. "
                    "Return only valid JSON."
                ),
            },
            {
                "role": "user",
                "content": build_prompt(questions),
            },
        ],
        "response_format": {"type": "json_object"},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw_response = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {body}") from error

    response_data = json.loads(raw_response)
    content = response_data["choices"][0]["message"]["content"]
    parsed = parse_json_content(content)
    items = parsed.get("items")

    if not isinstance(items, list):
        raise ValueError(f"Response missing items array: {content[:300]}")

    return validate_explanations(items, questions)


def build_prompt(questions: list[dict[str, Any]]) -> str:
    compact_questions = []

    for question in questions:
        compact_questions.append(
            {
                "questionId": question["id"],
                "chapter": f"Chapter {question['chapterId']} {question['chapterTitle']}",
                "prompt": question["prompt"],
                "options": question["options"],
                "answerKey": question["answerKey"],
            }
        )

    return (
        "Generate concise Chinese explanations for the multiple-choice questions below.\n"
        "You must strictly follow the provided answerKey and never change the answer.\n"
        "Return valid JSON in exactly this shape:\n"
        "{\n"
        '  "items": [\n'
        "    {\n"
        '      "questionId": "original questionId",\n'
        '      "answerKey": "A|B|C|D and it must equal the input answerKey",\n'
        '      "explanation": "2-4 Chinese sentences explaining why the correct answer is right",\n'
        '      "optionExplanations": {"A": "...", "B": "...", "C": "...", "D": "..."},\n'
        '      "confidence": "high|medium|low"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Do not output Markdown. Do not output any extra text.\n\n"
        f"Questions: {json.dumps(compact_questions, ensure_ascii=False)}"
    )


def parse_json_content(content: str) -> dict[str, Any]:
    content = content.strip()

    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?", "", content).strip()
        content = re.sub(r"```$", "", content).strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)

        if not match:
            raise

        return json.loads(match.group(0))


def validate_explanations(
    items: list[dict[str, Any]],
    questions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    expected_by_id = {question["id"]: question for question in questions}
    validated_items: list[dict[str, Any]] = []

    for item in items:
        question_id = item.get("questionId")
        expected = expected_by_id.get(question_id)

        if not expected:
            continue

        if item.get("answerKey") != expected["answerKey"]:
            raise ValueError(
                f"Answer mismatch for {question_id}: "
                f"{item.get('answerKey')} != {expected['answerKey']}"
            )

        option_explanations = item.get("optionExplanations")

        if not isinstance(option_explanations, dict):
            raise ValueError(f"Missing option explanations for {question_id}")

        clean_option_explanations = {
            key: clean_text(str(option_explanations.get(key, "")))
            for key in OPTION_KEYS
        }

        if not all(clean_option_explanations.values()):
            raise ValueError(f"Incomplete option explanations for {question_id}")

        confidence = item.get("confidence")

        if confidence not in {"high", "medium", "low"}:
            confidence = "medium"

        validated_items.append(
            {
                "questionId": question_id,
                "answerKey": item["answerKey"],
                "explanation": clean_text(str(item.get("explanation", ""))),
                "optionExplanations": clean_option_explanations,
                "confidence": confidence,
            }
        )

    return validated_items


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def write_question_bank(bank: dict[str, Any], output_path: Path) -> None:
    output_path.write_text(
        json.dumps(bank, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def chunked(items: list[dict[str, Any]], size: int):
    safe_size = max(size, 1)

    for index in range(0, len(items), safe_size):
        yield items[index : index + safe_size]


def render_progress(
    *,
    processed_count: int,
    total_questions: int,
    generated_count: int,
    failed_count: int,
    current_batch: int,
    total_batches: int,
    started_at: float,
) -> None:
    remaining_count = max(total_questions - processed_count, 0)
    ratio = 1.0 if total_questions == 0 else processed_count / total_questions
    bar_length = 24
    filled = min(bar_length, int(ratio * bar_length))
    bar = "#" * filled + "-" * (bar_length - filled)
    elapsed_seconds = max(time.perf_counter() - started_at, 0.0)
    rate = processed_count / elapsed_seconds if elapsed_seconds > 0 else 0.0
    eta_seconds = remaining_count / rate if rate > 0 else None

    line = (
        f"\r[{bar}] {ratio * 100:6.2f}% "
        f"{processed_count}/{total_questions} | "
        f"ok {generated_count} | fail {failed_count} | left {remaining_count} | "
        f"batch {current_batch}/{total_batches} | "
        f"elapsed {format_duration(elapsed_seconds)} | "
        f"eta {format_duration(eta_seconds)}"
    )
    sys.stdout.write(line)
    sys.stdout.flush()


def print_progress_message(message: str) -> None:
    sys.stdout.write("\n")
    sys.stdout.write(f"{message}\n")
    sys.stdout.flush()


def format_duration(seconds: float | None) -> str:
    if seconds is None:
        return "--:--"

    total_seconds = max(int(seconds), 0)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    if hours:
        return f"{hours:02}:{minutes:02}:{secs:02}"

    return f"{minutes:02}:{secs:02}"


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted by user.", file=sys.stderr)
        raise SystemExit(130)
