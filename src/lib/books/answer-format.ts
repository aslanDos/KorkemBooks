import type { AnswerFormat, AnswerMarkType } from "./types";

const MARK_TYPES = new Set<AnswerMarkType>(["bold", "italic", "underline"]);

export function emptyAnswerFormat(): AnswerFormat {
  return { version: 1, marks: [] };
}

export function normalizeAnswerFormat(value: unknown, textLength = 50000): AnswerFormat {
  if (!value || typeof value !== "object") return emptyAnswerFormat();
  const candidate = value as { version?: unknown; marks?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.marks)) return emptyAnswerFormat();
  const marks = candidate.marks.flatMap((mark) => {
    if (!mark || typeof mark !== "object") return [];
    const item = mark as { type?: unknown; from?: unknown; to?: unknown };
    if (typeof item.type !== "string" || !MARK_TYPES.has(item.type as AnswerMarkType) || !Number.isInteger(item.from) || !Number.isInteger(item.to)) return [];
    const from = Math.max(0, Math.min(textLength, Number(item.from)));
    const to = Math.max(from, Math.min(textLength, Number(item.to)));
    return to > from ? [{ type: item.type as AnswerMarkType, from, to }] : [];
  });
  return { version: 1, marks: marks.slice(0, 5000) };
}

export function sliceAnswerFormat(format: AnswerFormat, from: number, to: number): AnswerFormat {
  return {
    version: 1,
    marks: format.marks
      .filter((mark) => mark.from < to && mark.to > from)
      .map((mark) => ({ type: mark.type, from: Math.max(0, mark.from - from), to: Math.min(to, mark.to) - from })),
  };
}
