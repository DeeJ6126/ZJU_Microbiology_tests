from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from pypdf import PdfReader


PROJECT_ROOT = Path(__file__).resolve().parents[1]
QUESTION_BANK_PATH = PROJECT_ROOT / "public" / "question-bank.json"
PAST_EXAMS_DIR = PROJECT_ROOT / "tests"
OUTPUT_PATH = PROJECT_ROOT / "public" / "past-exams.json"
REPORT_PATH = PROJECT_ROOT / "tests" / "past-exams-match-report.md"
OPTION_KEYS = ("A", "B", "C", "D")
MANUAL_EXPLANATIONS: dict[tuple[str, int], dict[str, Any]] = {
    (
        "midterm-24",
        8,
    ): {
        "model": "manual-correction",
        "generatedAt": "2026-05-09T00:00:00",
        "explanation": "Staphylococcus 的名称来自葡萄串状球菌，细胞形态为球形；Escherichia coli 属于杆菌，细胞呈杆状。因此正确搭配是 spherical / rod shaped。",
        "optionExplanations": {
            "A": "正确，Staphylococcus 为球菌，Escherichia 为杆菌。",
            "B": "错误，Staphylococcus 不是杆状，Escherichia 也不是螺旋形。",
            "C": "错误，Escherichia 不是螺旋形。",
            "D": "错误，soiled 不是细菌形态描述，且顺序也不对。",
        },
        "confidence": "high",
    },
    (
        "midterm-24",
        9,
    ): {
        "model": "manual-correction",
        "generatedAt": "2026-05-09T00:00:00",
        "explanation": "细菌在导管、植入物等医疗器械表面常形成 biofilms。生物膜中的细胞被基质保护，对抗生素和免疫清除更耐受。",
        "optionExplanations": {
            "A": "正确，biofilms 是医疗器械相关感染和耐受性的关键形式。",
            "B": "错误，liquids 不是细菌在器械表面形成的耐受性结构。",
            "C": "错误，population 只是种群概念，不能解释表面附着和耐药性增强。",
            "D": "错误，community 过于泛化，题目指向的是生物膜结构。",
        },
        "confidence": "high",
    },
    (
        "midterm-24",
        48,
    ): {
        "model": "manual-correction",
        "generatedAt": "2026-05-09T00:00:00",
        "explanation": "在可诱导负调控系统中，inducer 与 repressor 结合后使阻遏蛋白失活，从而解除阻遏并开启代谢通路。题目选项 A 的 activate the pathway 指通路被启动。",
        "optionExplanations": {
            "A": "正确，诱导物结合阻遏蛋白后使通路表达被激活。",
            "B": "错误，诱导物不会使通路失活，而是解除阻遏。",
            "C": "错误，诱导物通常作用于调控蛋白，不是与底物结合来阻断诱导。",
            "D": "错误，诱导物不是酶-底物复合物的伴侣分子。",
        },
        "confidence": "high",
    },
}


@dataclass
class CandidateScore:
    overall: float
    stem_ratio: float
    option_ratio: float
    exact_option_hits: int
    candidate: dict[str, Any]


def main() -> None:
    bank = json.loads(QUESTION_BANK_PATH.read_text(encoding="utf-8"))
    existing_bank = load_existing_past_exam_bank()
    bank_questions = prepare_bank_questions(bank["questions"])
    exams = []
    report_lines = [
        "# Past Exam Match Report",
        "",
        f"Question bank source: `{QUESTION_BANK_PATH.name}`",
        "",
    ]

    for pdf_path in sorted(PAST_EXAMS_DIR.glob("*.pdf")):
        if pdf_path.name == OUTPUT_PATH.name:
            continue

        exam_id = build_exam_id(pdf_path)
        existing_questions = {
            question["number"]: question
            for exam in existing_bank.get("exams", [])
            if exam.get("id") == exam_id
            for question in exam.get("questions", [])
        }
        extracted_questions, reference_answers = extract_exam_questions(pdf_path)
        matched_questions = []
        unmatched_rows: list[str] = []

        for exam_question in extracted_questions:
            match = find_best_match(exam_question, bank_questions)
            enriched_question = build_exam_question(exam_question, match)
            existing_question = existing_questions.get(enriched_question["number"])
            preserve_existing_exam_question(enriched_question, existing_question)

            answer_key = reference_answers.get(enriched_question["number"])
            if answer_key:
                if enriched_question.get("answerKey") != answer_key:
                    enriched_question["aiExplanation"] = None
                enriched_question["answerKey"] = answer_key
                enriched_question["answerSource"] = "reference"

            apply_manual_explanation(exam_id, enriched_question)
            matched_questions.append(enriched_question)

            if not enriched_question.get("answerKey"):
                unmatched_rows.append(
                    f"- Q{enriched_question['number']}: {enriched_question['prompt']}"
                )

        exam_summary = summarize_exam_questions(matched_questions)
        exams.append(
            {
                "id": exam_id,
                "title": build_exam_title(pdf_path),
                "sourcePdf": pdf_path.name,
                "summary": exam_summary,
                "questions": matched_questions,
            }
        )

        report_lines.extend(
            [
                f"## {pdf_path.name}",
                "",
                f"- Total questions: {exam_summary['totalQuestions']}",
                f"- Auto-filled with known answer/explanation: {exam_summary['autoFilled']}",
                f"- Exact matches: {exam_summary['exactMatches']}",
                f"- High-confidence fuzzy matches: {exam_summary['highMatches']}",
                f"- Review-only matches: {exam_summary['reviewMatches']}",
                f"- Still needs API/manual work: {exam_summary['unmatched']}",
                "",
            ]
        )

        if unmatched_rows:
            report_lines.append("### Questions Still Missing Answers")
            report_lines.append("")
            report_lines.extend(unmatched_rows)
            report_lines.append("")

    payload = {
        "generatedAt": datetime.now().isoformat(),
        "sourceQuestionBank": QUESTION_BANK_PATH.name,
        "exams": exams,
    }

    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    REPORT_PATH.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    total_questions = sum(exam["summary"]["totalQuestions"] for exam in exams)
    total_filled = sum(exam["summary"]["autoFilled"] for exam in exams)
    total_unmatched = sum(exam["summary"]["unmatched"] for exam in exams)
    print(
        f"Generated {OUTPUT_PATH} with {len(exams)} exams, "
        f"{total_filled}/{total_questions} questions auto-filled, "
        f"{total_unmatched} still unmatched."
    )
    print(f"Report written to {REPORT_PATH}.")


def load_existing_past_exam_bank() -> dict[str, Any]:
    if not OUTPUT_PATH.exists():
        return {"exams": []}

    try:
        return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"exams": []}


def prepare_bank_questions(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prepared = []
    for question in questions:
        prepared.append(
            {
                **question,
                "normPrompt": normalize_text(question["prompt"]),
                "normOptions": {
                    option["key"]: normalize_text(option["text"])
                    for option in question["options"]
                },
            }
        )
    return prepared


def extract_exam_questions(pdf_path: Path) -> tuple[list[dict[str, Any]], dict[int, str]]:
    reader = PdfReader(str(pdf_path))
    raw_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    reference_answers = parse_reference_answers(raw_text)
    question_text = re.split(r"\s*参考答案\s*", raw_text, maxsplit=1)[0]
    cleaned_text = collapse_whitespace(replace_ligatures(question_text))
    markers = list(re.finditer(r"(?<![A-Za-z])(\d{1,2})[)）]\s*", cleaned_text))
    questions: list[dict[str, Any]] = []

    for index, marker in enumerate(markers):
        start = marker.start()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(cleaned_text)
        segment = cleaned_text[start:end].strip()
        parsed = parse_exam_question_segment(segment)
        if parsed:
            questions.append(parsed)

    return questions, reference_answers


def parse_exam_question_segment(segment: str) -> dict[str, Any] | None:
    number_match = re.match(r"(\d{1,2})[)）]\s*", segment)
    if not number_match:
        return None

    option_matches = list(re.finditer(r"(?<![A-Za-z0-9])([A-D])[)）]\s*", segment))
    if len(option_matches) < 4:
        return None

    number = int(number_match.group(1))
    stem = segment[number_match.end() : option_matches[0].start()].strip()
    options = []

    for index, match in enumerate(option_matches[:4]):
        key = match.group(1)
        start = match.end()
        end = (
            option_matches[index + 1].start()
            if index + 1 < len(option_matches[:4])
            else len(segment)
        )
        text = segment[start:end].strip()
        options.append({"key": key, "text": text})

    return {
        "number": number,
        "prompt": stem,
        "options": options,
        "normPrompt": normalize_text(stem),
        "normOptions": {option["key"]: normalize_text(option["text"]) for option in options},
    }


def parse_reference_answers(raw_text: str) -> dict[int, str]:
    text = collapse_whitespace(replace_ligatures(raw_text))
    answer_part_match = re.search(r"参考答案\s*(.+)$", text)
    if not answer_part_match:
        return {}

    answer_part = answer_part_match.group(1)
    answers: dict[int, str] = {}

    for match in re.finditer(r"(\d{1,2})-(\d{1,2})\s+([A-D]+)", answer_part):
        start = int(match.group(1))
        end = int(match.group(2))
        keys = match.group(3)

        for offset, question_number in enumerate(range(start, end + 1)):
            if offset < len(keys):
                answers[question_number] = keys[offset]

    return answers


def find_best_match(
    exam_question: dict[str, Any],
    bank_questions: list[dict[str, Any]],
) -> CandidateScore | None:
    exact_candidates = [
        question
        for question in bank_questions
        if question["normPrompt"] == exam_question["normPrompt"]
    ]

    if exact_candidates:
        best_exact = max(
            (score_candidate(exam_question, candidate) for candidate in exact_candidates),
            key=lambda item: item.overall,
        )
        return best_exact

    best_match: CandidateScore | None = None
    for candidate in bank_questions:
        score = score_candidate(exam_question, candidate)
        if best_match is None or score.overall > best_match.overall:
            best_match = score

    return best_match


def score_candidate(
    exam_question: dict[str, Any],
    candidate: dict[str, Any],
) -> CandidateScore:
    stem_ratio = SequenceMatcher(
        None,
        exam_question["normPrompt"],
        candidate["normPrompt"],
    ).ratio()

    option_ratios = []
    exact_option_hits = 0
    for key in OPTION_KEYS:
        exam_option = exam_question["normOptions"].get(key, "")
        candidate_option = candidate["normOptions"].get(key, "")
        ratio = SequenceMatcher(None, exam_option, candidate_option).ratio()
        option_ratios.append(ratio)
        if ratio >= 0.98:
            exact_option_hits += 1

    option_ratio = sum(option_ratios) / len(option_ratios)
    overall = stem_ratio * 0.82 + option_ratio * 0.18
    return CandidateScore(
        overall=overall,
        stem_ratio=stem_ratio,
        option_ratio=option_ratio,
        exact_option_hits=exact_option_hits,
        candidate=candidate,
    )


def build_exam_question(
    exam_question: dict[str, Any],
    match: CandidateScore | None,
) -> dict[str, Any]:
    result = {
        "number": exam_question["number"],
        "prompt": exam_question["prompt"],
        "options": exam_question["options"],
        "answerKey": None,
        "aiExplanation": None,
        "match": {
            "type": "none",
            "score": 0.0,
            "stemRatio": 0.0,
            "optionRatio": 0.0,
            "sourceQuestionId": None,
            "sourceChapterId": None,
        },
    }

    if not match:
        return result

    source = match.candidate
    match_type = classify_match(exam_question, match)
    result["match"] = {
        "type": match_type,
        "score": round(match.overall, 4),
        "stemRatio": round(match.stem_ratio, 4),
        "optionRatio": round(match.option_ratio, 4),
        "sourceQuestionId": source["id"],
        "sourceChapterId": source["chapterId"],
    }

    if match_type in {"exact", "high"}:
        result["answerKey"] = source["answerKey"]
        result["aiExplanation"] = source.get("aiExplanation")

    return result


def preserve_existing_exam_question(
    enriched_question: dict[str, Any],
    existing_question: dict[str, Any] | None,
) -> None:
    if not existing_question:
        return

    if normalize_text(existing_question.get("prompt", "")) != normalize_text(
        enriched_question["prompt"]
    ):
        return

    if existing_question.get("answerKey") and not enriched_question.get("answerKey"):
        enriched_question["answerKey"] = existing_question["answerKey"]

    if existing_question.get("aiExplanation") and not enriched_question.get("aiExplanation"):
        enriched_question["aiExplanation"] = existing_question["aiExplanation"]


def apply_manual_explanation(exam_id: str, enriched_question: dict[str, Any]) -> None:
    if enriched_question.get("aiExplanation"):
        return

    explanation = MANUAL_EXPLANATIONS.get((exam_id, enriched_question["number"]))
    if explanation:
        enriched_question["aiExplanation"] = explanation


def summarize_exam_questions(questions: list[dict[str, Any]]) -> dict[str, int]:
    summary = {
        "totalQuestions": len(questions),
        "autoFilled": 0,
        "exactMatches": 0,
        "highMatches": 0,
        "reviewMatches": 0,
        "unmatched": 0,
    }

    for question in questions:
        match_type = question["match"]["type"]
        if question.get("answerKey"):
            summary["autoFilled"] += 1
        if match_type == "exact":
            summary["exactMatches"] += 1
        elif match_type == "high":
            summary["highMatches"] += 1
        elif match_type == "review":
            summary["reviewMatches"] += 1
        else:
            summary["unmatched"] += 1

    return summary


def classify_match(exam_question: dict[str, Any], match: CandidateScore) -> str:
    if (
        exam_question["normPrompt"] == match.candidate["normPrompt"]
        and match.option_ratio >= 0.82
    ):
        return "exact"

    if (
        match.stem_ratio >= 0.9
        and match.option_ratio >= 0.7
        and match.exact_option_hits >= 2
    ):
        return "high"

    if match.stem_ratio >= 0.82 and match.option_ratio >= 0.55:
        return "review"

    return "none"


def build_exam_id(pdf_path: Path) -> str:
    digits = re.findall(r"\d+", pdf_path.stem)
    if digits:
        return f"midterm-{digits[0]}"

    text = pdf_path.stem.lower()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^0-9a-z-]+", "", text)
    return text or "midterm-unknown"


def build_exam_title(pdf_path: Path) -> str:
    digits = re.findall(r"\d+", pdf_path.stem)
    if digits:
        return f"20{digits[0]} 春夏期中卷"

    return pdf_path.stem


def normalize_text(text: str) -> str:
    cleaned = replace_ligatures(text)
    cleaned = cleaned.lower().replace("____", " ")
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"[^a-z0-9 ]+", "", cleaned)
    return cleaned.strip()


def collapse_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def replace_ligatures(text: str) -> str:
    return (
        text.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("ß", "b")
        .replace("", "D")
        .replace("₂", "2")
    )


if __name__ == "__main__":
    main()
