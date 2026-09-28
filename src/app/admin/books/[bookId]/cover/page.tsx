import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookCoverDesigner } from "@/components/books/book-cover-designer";
import { getAdminBookWithContent, getCoverTemplates } from "@/lib/books/queries";

export default async function AdminBookCoverPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const [book, templates] = await Promise.all([getAdminBookWithContent(bookId, "cover"), getCoverTemplates()]);
  if (!book) notFound();
  return <><header className="writer-page-header"><Link href={`/admin/books/${book.id}`}><ArrowLeft size={17} />К книге</Link><div><strong>{book.title}</strong></div></header><BookCoverDesigner book={book} templates={templates} readOnly={book.productionStatus !== "writing" && book.productionStatus !== "editing"} /></>;
}
