"use client";

import { useActionState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { updateBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Dialog } from "@/components/ui/dialog";
import { DialogActions } from "@/components/ui/dialog-actions";
import { FormField } from "@/components/ui/form-field";

type EditBookDialogProps = {
  bookId: string;
  title: string;
  authorName: string;
  recipientName: string;
};

export function EditBookDialog({ bookId, title, authorName, recipientName }: EditBookDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(updateBookAction, {});

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state]);

  return (
    <>
      <button className="book-hero__edit" type="button" onClick={() => { dialogRef.current?.querySelector("form")?.reset(); dialogRef.current?.showModal(); }}><Pencil size={15} /><span>Изменить</span></button>
      <Dialog className="edit-book-dialog" panelClassName="edit-book-dialog__panel" ref={dialogRef} title="Редактировать книгу" eyebrow="Данные книги">
        <form action={formAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <FormField id="edit-title" name="title" label="Название книги" defaultValue={title} maxLength={200} required />
          <FormField id="edit-author" name="authorName" label="Автор" defaultValue={authorName} maxLength={120} required />
          <FormField id="edit-recipient" name="recipientName" label="Получатель" defaultValue={recipientName} maxLength={120} />
          <FormFeedback error={state.error} />
          <DialogActions submitLabel="Сохранить" />
        </form>
      </Dialog>
    </>
  );
}
