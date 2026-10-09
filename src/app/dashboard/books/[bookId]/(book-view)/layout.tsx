import { notFound } from "next/navigation";
import { BookViewTabs } from "@/components/books/book-view-tabs";
import { BookWorkspaceOverview } from "@/components/books/book-workspace-overview";
import { getBookWithContent } from "@/lib/books/queries";

export default async function BookViewLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ bookId: string }> }>) {
  const { bookId } = await params;
  const book = await getBookWithContent(bookId, "summary");
  if (!book) notFound();

  return <>
    <BookWorkspaceOverview book={book} />
    <BookViewTabs bookId={book.id} />
    {children}
  </>;
}
