"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBookAction } from "@/app/admin/books/[bookId]/actions";

export function DeleteBookButton({ bookId, title }: { bookId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function deleteBook() {
    const confirmed = window.confirm(
      `Удалить книгу «${title}»? Это действие нельзя отменить. Вопросы, ответы и материалы книги тоже будут удалены.`,
    );
    if (!confirmed) return;

    setError("");
    startTransition(async () => {
      try {
        const result = await deleteBookAction(bookId);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.replace("/admin/books");
        router.refresh();
      } catch {
        setError("Не удалось удалить книгу. Попробуйте ещё раз");
      }
    });
  }

  return <div className="delete-book-control">
    <button className="delete-book-button" type="button" disabled={pending} onClick={deleteBook}>
      <Trash2 size={16} aria-hidden="true" />
      {pending ? "Удаляем…" : "Удалить книгу"}
    </button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
