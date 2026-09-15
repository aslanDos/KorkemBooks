export function getBookFooterLabel({ pageNumber, authorName, bookTitle, showAuthor, showTitle }: { pageNumber: number; authorName: string; bookTitle: string; showAuthor: boolean; showTitle: boolean }) {
  if (showAuthor && showTitle) return pageNumber % 2 === 1 ? authorName : bookTitle;
  if (showAuthor) return authorName;
  if (showTitle) return bookTitle;
  return "";
}
