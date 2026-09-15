import { paginateBookAnswer } from "./pagination";
import { sliceAnswerFormat } from "./answer-format";
import type { BookWithContent } from "./types";

// Keep statistics and the rendered PDF on the same page sequence.
export function getBookPrintLayout(book: Pick<BookWithContent, "chapters" | "questionTextSize" | "answerTextSize">) {
  const storyPages = book.chapters.flatMap((chapter, chapterIndex) => [
    { kind: "chapter" as const, key: `chapter-${chapter.id}`, chapter, chapterIndex },
    ...chapter.questions.filter(question => question.answer.trim() || question.images.length || question.blankPages.length).flatMap(question => {
      let answerOffset = 0;
      const questionPages = (question.answer.trim() ? paginateBookAnswer(question.prompt, question.answer, { question: book.questionTextSize, answer: book.answerTextSize }) : []).map((answerPart, answerPageIndex) => {
        const answerPageFormat = sliceAnswerFormat(question.answerFormat, answerOffset, answerOffset + answerPart.length);
        const page = { kind: "question" as const, key: answerPageIndex === 0 ? `question-${question.id}` : `question-${question.id}-continuation-${answerPageIndex}`, chapter, question, answerPart, answerPageFormat, answerPageIndex };
        answerOffset += answerPart.length + 1;
        return page;
      });
      const attachmentPages = [
        ...question.images.map(image => ({ kind: "photo" as const, key: `photo-${image.id}`, chapter, question, image, placement: image.placement, position: image.position })),
        ...question.blankPages.map(blankPage => ({ kind: "blank" as const, key: `blank-${blankPage.id}`, chapter, question, blankPage, placement: blankPage.placement, position: blankPage.position })),
      ].sort((a, b) => a.position - b.position);
      return [...attachmentPages.filter(page => page.placement === "before"), ...questionPages, ...attachmentPages.filter(page => page.placement === "after")];
    }),
  ]).map((page, index) => ({ ...page, pageNumber: index + 5 }));

  // User's printing policy: only question/answer pages are monochrome.
  // The first four pages are opening blank, title, preface, and contents.
  const colorPages = [1, 2, 3, 4, ...storyPages.filter(page => page.kind !== "question").map(page => page.pageNumber)];
  const monochromePages = storyPages.filter(page => page.kind === "question").map(page => page.pageNumber);
  return { storyPages, colorPages, monochromePages, totalPages: storyPages.length + 4 };
}

export type BookPrintLayout = ReturnType<typeof getBookPrintLayout>;

export function formatPrintPageRanges(pages: number[]) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index];
    let end = start;
    while (sorted[index + 1] === end + 1) end = sorted[++index];
    ranges.push(start === end ? String(start) : `${start}-${end}`);
  }
  return ranges.join(", ");
}
