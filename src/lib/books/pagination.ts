const TEXT_WIDTH = 352;
const TEXT_AREA_HEIGHT = 482;
const QUESTION_ANSWER_GAP = 12;

function characterWidth(character: string, fontSize: number) {
  if (character === " ") return fontSize * 0.3;
  if (/[.,:;!?'’"«»()\-–—]/u.test(character)) return fontSize * 0.34;
  if (/[ilI1|]/u.test(character)) return fontSize * 0.32;
  if (/[mwMWЖШЩЮФ]/u.test(character)) return fontSize * 0.82;
  if (/[A-ZА-ЯЁ]/u.test(character)) return fontSize * 0.68;
  return fontSize * 0.6;
}

function wrapIntoLines(text: string, fontSize: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    let width = 0;
    let lastSpace = -1;
    for (const character of paragraph) {
      const nextWidth = width + characterWidth(character, fontSize);
      if (nextWidth <= TEXT_WIDTH || !line) {
        line += character;
        width = nextWidth;
        if (character === " ") lastSpace = line.length - 1;
        continue;
      }
      if (lastSpace >= 0) {
        const remainder = `${line.slice(lastSpace + 1)}${character}`;
        lines.push(line.slice(0, lastSpace).trimEnd());
        line = remainder.trimStart();
      } else {
        lines.push(line);
        line = character;
      }
      width = [...line].reduce((total, item) => total + characterWidth(item, fontSize), 0);
      lastSpace = line.lastIndexOf(" ");
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function paginateBookAnswer(prompt: string, answer: string, sizes: { question: number; answer: number } = { question: 12, answer: 18 }) {
  const questionLineHeight = sizes.question * 1.5;
  const answerLineHeight = sizes.answer * 1.42;
  const answerLines = wrapIntoLines(answer.trim(), sizes.answer);
  if (!answer.trim()) return [""];

  const questionLines = Math.max(1, wrapIntoLines(prompt, sizes.question).length);
  const firstPageLines = Math.max(1, Math.floor((TEXT_AREA_HEIGHT - questionLines * questionLineHeight - QUESTION_ANSWER_GAP) / answerLineHeight));
  const continuationLines = Math.max(1, Math.floor(TEXT_AREA_HEIGHT / answerLineHeight));
  const pages: string[] = [];
  let cursor = 0;
  let capacity = firstPageLines;
  while (cursor < answerLines.length) {
    pages.push(answerLines.slice(cursor, cursor + capacity).join("\n"));
    cursor += capacity;
    capacity = continuationLines;
  }
  return pages;
}
