import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookCoverDesigner } from "@/components/books/book-cover-designer";
import { getBookWithContent, getCoverTemplates } from "@/lib/books/queries";

export default async function BookCoverPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const [book, templates] = await Promise.all([getBookWithContent(bookId, "cover"), getCoverTemplates()]);
  if (!book) notFound();

  return <><header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К структуре</Link><div><strong>{book.title}</strong>{book.productionStatus !== "writing" && <small>Только просмотр</small>}</div></header><BookCoverDesigner book={book} templates={templates} readOnly={book.productionStatus !== "writing"} /></>;
}
