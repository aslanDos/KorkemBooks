import { getBookPrintLayout } from "./print-layout";
import type { BookWithContent } from "./types";

export const BOOK_TARGET_PAGE_COUNT = 100;
export const BOOK_MINIMUM_SUBMISSION_PAGE_COUNT = 50;

export function getBookPageProgress(book: Pick<BookWithContent, "chapters" | "questionTextSize" | "answerTextSize">) {
  const totalPages = getBookPrintLayout(book).totalPages;
  const progress = Math.min(100, Math.floor((totalPages / BOOK_TARGET_PAGE_COUNT) * 100));
  return { progress, totalPages };
}
