"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BookPlus } from "lucide-react";
import { assignUserBookTypeAction, type AssignBookTypeState } from "@/app/admin/users/actions";
import { Dialog } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { BookType } from "@/lib/books/types";
import { isBookTypeReady } from "@/lib/books/catalog";
import { BOOK_LANGUAGES } from "@/lib/books/language";

const initialState: AssignBookTypeState = {};

export function AssignBookTypeForm({ userId, bookTypes }: { userId: string; bookTypes: BookType[] }) {
  const [state, action, pending] = useActionState(assignUserBookTypeAction, initialState);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    dialogRef.current?.close();
    router.refresh();
  }, [state, router]);

  return <div className="admin-add-book-control">
    <button className="admin-add-book-button" type="button" aria-label="Добавить книгу" title="Добавить книгу" onClick={() => dialogRef.current?.showModal()}>
      <BookPlus size={16} aria-hidden="true" />
    </button>
    <Dialog
      ref={dialogRef}
      className="submit-book-dialog"
      panelClassName="submit-book-dialog__panel"
      eyebrow="Новая книга"
      title="Выдать пользователю книгу"
      closeDisabled={pending}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <form action={action} className="admin-grant-book-form">
        <input type="hidden" name="userId" value={userId} />
        <label>
          <span>Кому посвящена книга</span>
          <select name="bookTypeId" defaultValue="" required>
            <option value="" disabled>Выберите получателя</option>
            {bookTypes.filter(isBookTypeReady).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        <label>
          <span>Язык книги</span>
          <select name="bookLanguage" defaultValue="ru" required>
            {BOOK_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
          </select>
        </label>
        <FormFeedback error={state.error} />
        <div className="submit-book-dialog__actions">
          <button type="button" disabled={pending} onClick={() => dialogRef.current?.close()}>Отмена</button>
          <button className="primary-button" type="submit" disabled={pending}>
            <BookPlus size={15} aria-hidden="true" />{pending ? "Добавляем…" : "Выдать книгу"}
          </button>
        </div>
      </form>
    </Dialog>
  </div>;
}
