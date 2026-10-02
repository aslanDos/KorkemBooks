import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookPreviewGallery } from "@/components/books/book-preview-gallery";
import { getBookWithContent, getLastViewedQuestionId } from "@/lib/books/queries";

export default async function WriteBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string }> }) {
  const { bookId } = await params;
  const { question } = await searchParams;
  const [book, lastViewedQuestionId] = await Promise.all([getBookWithContent(bookId), getLastViewedQuestionId(bookId)]);
  if (!book) notFound();
  if (book.productionStatus !== "writing") redirect(`/dashboard/books/${book.id}/preview${question ? `?question=${encodeURIComponent(question)}` : ""}`);
  const firstQuestionId = book.chapters.flatMap((chapter) => chapter.questions)[0]?.id;
  return (
    <>
      <header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К структуре</Link><div><strong>{book.title}</strong></div></header>
      <BookPreviewGallery book={book} initialQuestionId={question ?? lastViewedQuestionId ?? firstQuestionId} />
    </>
  );
}
