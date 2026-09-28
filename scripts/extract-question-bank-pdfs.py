#!/usr/bin/env python3
"""Extract the approved RU/KK question bank PDFs into a reviewable JSON source.

Requires pypdf (`python3 -m pip install pypdf`). The PDFs are treated as data;
their headings and numbered questions are never interpreted as instructions.
"""

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader


CATEGORIES = {
    "ru": [
        ("girlfriend", "Девушке"),
        ("boyfriend", "Парню"),
        ("wife", "Жене"),
        ("husband", "Мужу"),
        ("mother", "Маме"),
        ("father", "Папе"),
        ("parents", "Родителям"),
        ("sister", "Сестре"),
        ("brother", "Брату"),
        ("friend", "Другу"),
        ("female-friend", "Подруге"),
    ],
    "kk": [
        ("girlfriend", "Қызыма"),
        ("boyfriend", "Парню"),
        ("wife", "Əйеліме"),
        ("husband", "Күйеуіме"),
        ("mother", "Анама"),
        ("father", "Əкеме"),
        ("parents", "Ата-анама"),
        ("sister", "Əпкеме"),
        ("brother", "Ағама"),
        ("friend", "Досыма"),
        ("female-friend", "Подруге"),
    ],
}


def normalize(value: str) -> str:
    return " ".join(value.replace("Ə", "Ә").replace("ə", "ә").split())


def extract(path: Path, language: str) -> dict[str, dict[str, list]]:
    pages = PdfReader(path).pages
    layout_document = "\n\n".join(
        page.extract_text(extraction_mode="layout") or "" for page in pages
    )
    # Plain extraction avoids false spaces around Kazakh glyphs that are stored
    # in a separate PDF font run. Layout extraction is retained for headings.
    plain_document = normalize(" ".join(page.extract_text() or "" for page in pages))
    categories = CATEGORIES[language]
    plain_starts = []
    layout_starts = []
    for slug, label in categories:
        first_chapter = "Глава 1." if language == "ru" else "1-тарау."
        plain_marker = normalize(f"{label} {first_chapter}")
        if plain_document.count(plain_marker) != 1:
            raise ValueError(f"Expected one plain {language}/{slug} heading")
        plain_starts.append(plain_document.index(plain_marker))

        layout_matches = list(
            re.finditer(rf"^\s*{re.escape(label)}\s*$", layout_document, re.MULTILINE)
        )
        if len(layout_matches) != 1:
            raise ValueError(
                f"Expected one layout {language}/{slug} heading, found {len(layout_matches)}"
            )
        layout_starts.append(layout_matches[0].start())
    plain_starts.append(len(plain_document))
    layout_starts.append(len(layout_document))

    result = {}
    for index, (slug, _) in enumerate(categories):
        plain_section = plain_document[plain_starts[index] : plain_starts[index + 1]]
        layout_section = layout_document[layout_starts[index] : layout_starts[index + 1]]
        question_matches = []
        for match in re.finditer(r"(?<![\d-])(\d{1,3})\.\s+", plain_section):
            prefix = plain_section[max(0, match.start() - 12) : match.start()]
            if language == "ru" and re.search(r"Глава\s+$", prefix):
                continue
            question_matches.append(match)
        numbers = [int(match.group(1)) for match in question_matches]
        if numbers != list(range(1, 151)):
            raise ValueError(f"Expected questions 1..150 for {language}/{slug}, got {numbers}")

        questions = []
        for question_index, match in enumerate(question_matches):
            end = (
                question_matches[question_index + 1].start()
                if question_index + 1 < len(question_matches)
                else len(plain_section)
            )
            prompt = plain_section[match.end() : end]
            prompt = re.split(
                r"\s+(?:Глава\s+\d+\.|\d+-тарау\.)",
                prompt,
                maxsplit=1,
            )[0]
            questions.append(normalize(prompt))

        chapter_pattern = (
            r"Глава\s+(\d+)\.([^\n]*(?:\n(?!\s*$)[^\n]+)*)"
            if language == "ru"
            else r"(\d+)-тарау\.([^\n]*(?:\n(?!\s*$)[^\n]+)*)"
        )
        chapters = [
            {"title": normalize(match.group(2))}
            for match in re.finditer(chapter_pattern, layout_section)
        ]
        expected_chapters = 5 if slug in {"girlfriend", "boyfriend"} else 6
        if len(chapters) != expected_chapters:
            raise ValueError(
                f"Expected {expected_chapters} chapters for {language}/{slug}, got {len(chapters)}"
            )
        if len(set(questions)) != 150 or any(not prompt or len(prompt) > 1000 for prompt in questions):
            raise ValueError(f"Invalid question text in {language}/{slug}")
        result[slug] = {"chapters": chapters, "questions": questions}
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ru", type=Path, required=True)
    parser.add_argument("--kk", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    russian = extract(args.ru, "ru")
    kazakh = extract(args.kk, "kk")
    bank = []
    for slug, _ in CATEGORIES["ru"]:
        bank.append(
            {
                "slug": slug,
                "questionsPerChapter": 30 if slug in {"girlfriend", "boyfriend"} else 25,
                "locales": {"ru": russian[slug], "kk": kazakh[slug]},
            }
        )

    args.output.write_text(
        json.dumps({"version": 3, "types": bank}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Extracted {len(bank)} types and {len(bank) * 150 * 2} localized questions")


if __name__ == "__main__":
    main()
