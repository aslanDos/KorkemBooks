"use client";

import { Send } from "lucide-react";
import { submitBookForEditingAction } from "@/app/dashboard/books/actions";

export function SubmitBookButton({ bookId, progress }: { bookId: string; progress: number }) {
  const canSubmit = progress >= 50;

  return (
    <form
      className="submit-book-form"
      action={submitBookForEditingAction}
      onSubmit={event => {
        if (!canSubmit || !window.confirm("После отправки редактирование будет недоступно. Отправить книгу на редактуру?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="bookId" value={bookId} />
      <button
        className="secondary-content-button"
        type="submit"
        disabled={!canSubmit}
        title={canSubmit ? undefined : "Книга должна быть заполнена минимум на 50%"}
      >
        <Send size={15} />
        Отправить на редактуру
      </button>
    </form>
  );
}
