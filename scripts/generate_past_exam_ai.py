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
PAST_EXAMS_PATH = PROJECT_ROOT / "public" / "past-exams.json"
DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DEFAULT_MODEL = "qwen3.5-122b-a10b"
OPTION_KEYS = ("A", "B", "C", "D")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fill missing answers and explanations in past-exams.json with DashScope.",
    )
    parser.add_argument("--input", default=str(PAST_EXAMS_PATH))
    parser.add_argument("--output", default=str(PAST_EXAMS_PATH))
    parser.add_argument("--model", default=os.getenv("DASHSCOPE_MODEL") or DEFAULT_MODEL)
    parser.add_argument("--url", default=DASHSCOPE_URL)
    parser.add_argument("--batch-size", type=int, default=5)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--sleep", type=float, default=0.35)
    parser.add_argument("--exam-id", default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    api_key = get_dashscope_key()
    if not api_key and not args.dry_run:
        raise SystemExit(
            "Missing DASHSCOPE_API_KEY_BIOLOGY or DASHSCOPE_API_KEY environment variable."
        )

    input_path = Path(args.input)
    output_path = Path(args.output)
    data = json.loads(input_path.read_text(encoding="utf-8"))
    pending_items = collect_pending_questions(
        data,
        exam_id=args.exam_id,
        force=args.force,
    )

    if args.limit is not None:
        pending_items = pending_items[: args.limit]

    print(
        f"Past-exam AI fill target: {len(pending_items)} questions "
        f"(force={args.force}, model={args.model}, exam={args.exam_id or 'all'})."
    )

    if args.dry_run:
        for item in pending_items[: min(5, len(pending_items))]:
            print(
                to_console_text(
                    f"{item['examId']} Q{item['question']['number']} {item['question']['prompt']}"
                )
            )
        return

    if not pending_items:
        print("No pending questions to process.")
        return

    generated_count = 0
    processed_count = 0
    failed_ids: set[str] = set()
    started_at = time.perf_counter()
    total_questions = len(pending_items)
    total_batches = len(list(chunked(pending_items, args.batch_size)))

    render_progress(
        processed_count=0,
        total_questions=total_questions,
        generated_count=0,
        failed_count=0,
        current_batch=0,
        total_batches=total_batches,
        started_at=started_at,
    )

    for batch_index, batch in enumerate(chunked(pending_items, args.batch_size), start=1):
        print_progress_message(f"[batch {batch_index}] requesting {len(batch)} answers...")

        try:
            answers = request_batch_answers(
                api_key=api_key,
                url=args.url,
                model=args.model,
                items=batch,
            )
        except Exception as batch_error:
            print_progress_message(f"[batch {batch_index}] batch failed: {batch_error}")
            answers = request_items_one_by_one(
                api_key=api_key,
                url=args.url,
                model=args.model,
                items=batch,
                failed_ids=failed_ids,
            )

        answers_by_key = {
            f"{answer['examId']}::{answer['number']}": answer for answer in answers
        }

        for item in batch:
            question = item["question"]
            item_key = f"{item['examId']}::{question['number']}"
            answer = answers_by_key.get(item_key)

            if not answer:
                failed_ids.add(item_key)
                continue

            question["answerKey"] = answer["answerKey"]
            question["aiExplanation"] = {
                "model": args.model,
                "generatedAt": datetime.now().isoformat(),
                "explanation": answer["explanation"],
                "optionExplanations": answer["optionExplanations"],
                "confidence": answer["confidence"],
            }
            question["answerSource"] = "ai"
            generated_count += 1

        processed_count += len(batch)
        output_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
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
        print("Some questions failed and were left without AI answers:")
        for failed_id in sorted(failed_ids):
            print(f"- {failed_id}")

    print()
    print(f"Done. Filled AI answers: {generated_count}. Output: {output_path}")


def collect_pending_questions(
    data: dict[str, Any],
    *,
    exam_id: str | None,
    force: bool,
) -> list[dict[str, Any]]:
    pending = []
    for exam in data.get("exams", []):
        if exam_id and exam["id"] != exam_id:
            continue

        for question in exam.get("questions", []):
            needs_fill = force or not question.get("answerKey") or not question.get("aiExplanation")
            if needs_fill:
                pending.append({"examId": exam["id"], "question": question})

    return pending


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


def request_items_one_by_one(
    *,
    api_key: str,
    url: str,
    model: str,
    items: list[dict[str, Any]],
    failed_ids: set[str],
) -> list[dict[str, Any]]:
    answers: list[dict[str, Any]] = []

    for item in items:
        try:
            answers.extend(
                request_batch_answers(
                    api_key=api_key,
                    url=url,
                    model=model,
                    items=[item],
                )
            )
            time.sleep(0.25)
        except Exception as item_error:
            failed_id = f"{item['examId']}::{item['question']['number']}"
            print_progress_message(f"[{failed_id}] failed: {item_error}")
            failed_ids.add(failed_id)

    return answers


def request_batch_answers(
    *,
    api_key: str,
    url: str,
    model: str,
    items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    payload = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a careful microbiology teaching assistant. "
                    "For each multiple-choice question, choose the best answer and write a concise Chinese explanation. "
                    "Return only valid JSON."
                ),
            },
            {
                "role": "user",
                "content": build_prompt(items),
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
    items_payload = parsed.get("items")

    if not isinstance(items_payload, list):
        raise ValueError(f"Response missing items array: {content[:300]}")

    return validate_answers(items_payload, items)


def build_prompt(items: list[dict[str, Any]]) -> str:
    compact_items = []

    for item in items:
        question = item["question"]
        compact_items.append(
            {
                "examId": item["examId"],
                "number": question["number"],
                "prompt": question["prompt"],
                "options": question["options"],
            }
        )

    return (
        "For each question below, choose the best answer and explain it in concise Chinese.\n"
        "Return valid JSON in exactly this shape:\n"
        "{\n"
        '  "items": [\n'
        "    {\n"
        '      "examId": "exam id",\n'
        '      "number": 1,\n'
        '      "answerKey": "A|B|C|D",\n'
        '      "explanation": "2-4 Chinese sentences",\n'
        '      "optionExplanations": {"A": "...", "B": "...", "C": "...", "D": "..."},\n'
        '      "confidence": "high|medium|low"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Do not output Markdown. Do not output any extra text.\n\n"
        f"Questions: {json.dumps(compact_items, ensure_ascii=False)}"
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


def validate_answers(
    items_payload: list[dict[str, Any]],
    original_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    expected_by_key = {
        f"{item['examId']}::{item['question']['number']}": item["question"]
        for item in original_items
    }
    validated_items = []

    for item in items_payload:
        exam_id = str(item.get("examId", ""))
        number = item.get("number")
        key = f"{exam_id}::{number}"
        expected_question = expected_by_key.get(key)

        if not expected_question:
            continue

        answer_key = str(item.get("answerKey", "")).strip().upper()
        if answer_key not in OPTION_KEYS:
            raise ValueError(f"Invalid answerKey for {key}: {answer_key}")

        option_explanations = item.get("optionExplanations")
        if not isinstance(option_explanations, dict):
            raise ValueError(f"Missing option explanations for {key}")

        clean_option_explanations = {
            option_key: clean_text(str(option_explanations.get(option_key, "")))
            for option_key in OPTION_KEYS
        }

        if not all(clean_option_explanations.values()):
            raise ValueError(f"Incomplete option explanations for {key}")

        confidence = item.get("confidence")
        if confidence not in {"high", "medium", "low"}:
            confidence = "medium"

        validated_items.append(
            {
                "examId": exam_id,
                "number": number,
                "answerKey": answer_key,
                "explanation": clean_text(str(item.get("explanation", ""))),
                "optionExplanations": clean_option_explanations,
                "confidence": confidence,
            }
        )

    return validated_items


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


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


def to_console_text(value: str) -> str:
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    return value.encode(encoding, errors="replace").decode(encoding, errors="replace")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted by user.", file=sys.stderr)
        raise SystemExit(130)
