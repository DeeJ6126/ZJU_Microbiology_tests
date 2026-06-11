from __future__ import annotations

import json
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_ROOT / "mid_exam" / "tests"
OUTPUT_BANK = PROJECT_ROOT / "public" / "question-bank.json"
OUTPUT_PDF_DIR = PROJECT_ROOT / "public" / "pdfs"

FIGURE_PATTERNS = (
    "shown below",
    "figure below",
    "following figure",
    "tree below",
    "diagram below",
    "image below",
    "map shown below",
)


def main() -> None:
    pdf_files = sorted(
        SOURCE_DIR.glob("chapter *.pdf"),
        key=lambda path: int(re.search(r"(\d+)", path.stem).group(1)),
    )

    if not pdf_files:
        raise SystemExit(f"No chapter PDFs found in {SOURCE_DIR}")

    OUTPUT_PDF_DIR.mkdir(parents=True, exist_ok=True)

    chapters = []
    questions = []

    for pdf_path in pdf_files:
        raw_text = extract_pdf_text(pdf_path)
        chapter_id, chapter_title = extract_chapter_info(raw_text, pdf_path.name)
        public_pdf_name = f"chapter-{chapter_id:02d}.pdf"

        shutil.copy2(pdf_path, OUTPUT_PDF_DIR / public_pdf_name)

        chapter_questions = parse_questions(
            chapter_id=chapter_id,
            chapter_title=chapter_title,
            mc_section=extract_multiple_choice_section(raw_text),
            page_texts=extract_page_texts(pdf_path),
            source_pdf=f"pdfs/{public_pdf_name}",
        )

        chapters.append(
            {
                "id": chapter_id,
                "title": chapter_title,
                "questionCount": len(chapter_questions),
                "sourcePdf": f"pdfs/{public_pdf_name}",
            }
        )
        questions.extend(chapter_questions)

    OUTPUT_BANK.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_BANK.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now().isoformat(),
                "totalQuestions": len(questions),
                "chapters": chapters,
                "questions": questions,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Generated {len(questions)} questions across {len(chapters)} chapters.")
    print(f"Question bank written to {OUTPUT_BANK}")


def extract_pdf_text(pdf_path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    return result.stdout


def extract_chapter_info(raw_text: str, filename: str) -> tuple[int, str]:
    match = re.search(r"^Chapter\s+(\d+)\s+(.+)$", raw_text, re.MULTILINE)

    if not match:
        raise ValueError(f"Could not extract chapter info from {filename}")

    return int(match.group(1)), clean_text(match.group(2))


def extract_multiple_choice_section(raw_text: str) -> str:
    cleaned = raw_text.replace("\r\n", "\n").replace("\r", "\n").replace("\f", "\n")
    cleaned = re.sub(
        r"^\s*Brock Biology of Microorganisms.*$\n?",
        "",
        cleaned,
        flags=re.MULTILINE,
    )
    cleaned = re.sub(r"^\s*Copyright .*$\n?", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"^\s*\d+\s*$\n?", "", cleaned, flags=re.MULTILINE)

    match = re.search(
        r"Multiple Choice Questions(.*?)(?:True/False Questions|Essay Questions)",
        cleaned,
        re.DOTALL,
    )

    if not match:
        raise ValueError("Could not locate multiple choice section")

    return match.group(1).strip()


def parse_questions(
    *,
    chapter_id: int,
    chapter_title: str,
    mc_section: str,
    page_texts: list[str],
    source_pdf: str,
) -> list[dict[str, object]]:
    positions = [match.start() for match in re.finditer(r"(?m)^\d+\)", mc_section)]
    positions.append(len(mc_section))

    parsed_questions = []

    for index in range(len(positions) - 1):
        block = mc_section[positions[index] : positions[index + 1]].strip()
        match = re.search(
            r"^\s*(?P<number>\d+)\)\s*(?P<prompt>.*?)\nA\)\s*(?P<A>.*?)\nB\)\s*(?P<B>.*?)\nC\)\s*(?P<C>.*?)\nD\)\s*(?P<D>.*?)\nAnswer:\s*(?P<answer>[A-D])\b",
            block,
            re.DOTALL,
        )

        if not match:
            raise ValueError(f"Failed to parse question block:\n{block[:400]}")

        number = int(match.group("number"))
        prompt = clean_text(match.group("prompt"))
        answer_key = match.group("answer")

        parsed_questions.append(
            {
                "id": f"chapter-{chapter_id:02d}-q-{number:03d}",
                "chapterId": chapter_id,
                "chapterTitle": chapter_title,
                "number": number,
                "prompt": prompt,
                "options": [
                    {"key": "A", "text": clean_text(match.group("A"))},
                    {"key": "B", "text": clean_text(match.group("B"))},
                    {"key": "C", "text": clean_text(match.group("C"))},
                    {"key": "D", "text": clean_text(match.group("D"))},
                ],
                "answerKey": answer_key,
                "sourcePdf": source_pdf,
                "sourcePage": locate_source_page(page_texts, number, prompt),
                "hasFigure": any(pattern in block.lower() for pattern in FIGURE_PATTERNS),
            }
        )

    return parsed_questions


def extract_page_texts(pdf_path: Path) -> list[str]:
    document = fitz.open(pdf_path)

    try:
        return [normalize_for_search(page.get_text("text")) for page in document]
    finally:
        document.close()


def locate_source_page(page_texts: list[str], question_number: int, prompt: str) -> int | None:
    normalized_prompt = normalize_for_search(prompt)
    numbered_prompt = normalize_for_search(f"{question_number}) {prompt}")
    candidates = (
        numbered_prompt[:140],
        numbered_prompt[:100],
        normalized_prompt[:100],
        normalized_prompt[:60],
    )

    for page_index, page_text in enumerate(page_texts, start=1):
        if any(candidate and candidate in page_text for candidate in candidates):
            return page_index

    return None


def clean_text(value: str) -> str:
    value = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "-", value)
    value = re.sub(r"\s*\n\s*", " ", value)
    value = re.sub(r"\s{2,}", " ", value)
    return value.strip()


def normalize_for_search(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().lower()


if __name__ == "__main__":
    main()
