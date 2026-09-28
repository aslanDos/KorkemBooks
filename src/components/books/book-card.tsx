import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BookSummary } from "@/lib/books/types";
import { BOOK_PRODUCTION_LABELS } from "@/lib/books/production-status";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link className="book-card" href={`/dashboard/books/${book.id}`}>
      <div className="book-card__top"><span>{book.book_types?.name ?? "Книга"}</span><small>{BOOK_PRODUCTION_LABELS[book.productionStatus]}</small></div>
      <div className="book-card__title"><h3>{book.title}</h3><ArrowUpRight size={18} /></div>
      <p>Автор: {book.author_name}</p>
      {book.recipient_name && <p>Для: {book.recipient_name}</p>}
      <div className="book-card__progress"><span style={{ width: `${book.progress}%` }} /></div>
      <small>Готовность: {book.progress}%</small>
    </Link>
  );
}
