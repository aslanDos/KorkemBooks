import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BookSummary } from "@/lib/books/types";

const statusLabels = { draft: "Черновик", in_progress: "В работе", completed: "Готова", archived: "В архиве" } as const;

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <Link className="book-card" href={`/dashboard/books/${book.id}`}>
      <div className="book-card__top"><span>{book.book_types?.name ?? "Книга"}</span><small>{statusLabels[book.status]}</small></div>
      <div className="book-card__title"><h3>{book.title}</h3><ArrowUpRight size={18} /></div>
      <p>Автор: {book.author_name}</p>
      {book.recipient_name && <p>Для: {book.recipient_name}</p>}
      <div className="book-card__progress"><span style={{ width: `${book.progress}%` }} /></div>
      <small>Готовность: {book.progress}%</small>
    </Link>
  );
}
