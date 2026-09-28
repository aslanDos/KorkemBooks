import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookReaderPreview } from "@/components/books/book-reader-preview";
import { getBookWithContent } from "@/lib/books/queries";

export default async function PreviewBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string; page?: string; settings?: string }> }) {
  const { bookId } = await params;
  const { question, page, settings } = await searchParams;
  const book = await getBookWithContent(bookId);
  if (!book) notFound();
  const initialSettingsGroup = settings === "title" || settings === "chapter" || settings === "page" ? settings : undefined;

  return <>
    <header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К вопросам</Link><div><strong>{book.title}</strong></div></header>
    <BookReaderPreview book={book} initialQuestionId={question} initialPageKey={page} initialSettingsGroup={initialSettingsGroup} />
  </>;
}
