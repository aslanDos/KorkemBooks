const UPDATED_BOOK_TYPE_SLUGS = new Set([
  "girlfriend", "boyfriend", "wife", "husband", "mother", "father",
  "parents", "sister", "brother", "friend", "female-friend",
]);
const REMOVED_BOOK_TYPE_SLUGS = new Set(["son", "daughter"]);

export function isRemovedBookTypeSlug(bookTypeSlug: string) {
  return REMOVED_BOOK_TYPE_SLUGS.has(bookTypeSlug);
}

export function getExpectedQuestionCount(bookTypeSlug: string) {
  return UPDATED_BOOK_TYPE_SLUGS.has(bookTypeSlug) ? 150 : 100;
}

export function getExpectedChapterCount(bookTypeSlug: string) {
  if (!UPDATED_BOOK_TYPE_SLUGS.has(bookTypeSlug)) return 4;
  return bookTypeSlug === "girlfriend" || bookTypeSlug === "boyfriend" ? 5 : 6;
}

export function isBookTypeReady(bookType: { slug: string; questionCount: number }) {
  return !isRemovedBookTypeSlug(bookType.slug) && bookType.questionCount === getExpectedQuestionCount(bookType.slug);
}
