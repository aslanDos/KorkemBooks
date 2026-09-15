import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookReaderPreview } from "@/components/books/book-reader-preview";
import { getBookWithContent } from "@/lib/books/queries";

export default async function PreviewBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string }> }) {
  const { bookId } = await params;
  const { question } = await searchParams;
  const book = await getBookWithContent(bookId);
  if (!book) notFound();

  return <>
    <header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К вопросам</Link><div><strong>{book.title}</strong></div></header>
    <BookReaderPreview book={book} initialQuestionId={question} />
  </>;
}
