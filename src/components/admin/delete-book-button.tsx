"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBookAction } from "@/app/admin/books/[bookId]/actions";
import { Dialog } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";

export function DeleteBookButton({ bookId, title }: { bookId: string; title: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function deleteBook() {
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
    <button className="delete-book-button" type="button" disabled={pending} onClick={() => dialogRef.current?.showModal()}>
      <Trash2 size={16} aria-hidden="true" />
      {pending ? "Удаляем…" : "Удалить книгу"}
    </button>
    <Dialog
      ref={dialogRef}
      className="submit-book-dialog"
      panelClassName="submit-book-dialog__panel"
      eyebrow="Удаление книги"
      title={`Удалить «${title}»?`}
      closeDisabled={pending}
      onCancel={(event) => {
        if (!pending) return;
        event.preventDefault();
      }}
    >
      <div className="submit-book-dialog__notice">
        <span><Trash2 size={20} aria-hidden="true" /></span>
        <p>Книга, все вопросы, ответы и загруженные материалы будут удалены без возможности восстановления.</p>
      </div>
      <FormFeedback error={error} />
      <div className="submit-book-dialog__actions">
        <button type="button" disabled={pending} onClick={() => dialogRef.current?.close()}>Отмена</button>
        <button className="primary-button" type="button" disabled={pending} onClick={deleteBook}>
          <Trash2 size={15} aria-hidden="true" />
          {pending ? "Удаляем…" : "Удалить книгу"}
        </button>
      </div>
    </Dialog>
  </div>;
}
