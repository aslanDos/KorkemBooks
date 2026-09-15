"use client";

import { useActionState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";
import { updateChapterAction } from "@/app/dashboard/books/structure-actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Dialog } from "@/components/ui/dialog";
import { DialogActions } from "@/components/ui/dialog-actions";

type ChapterControlsProps = {
  bookId: string;
  chapterId: string;
  title: string;
};

export function ChapterControls({ bookId, chapterId, title }: ChapterControlsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(updateChapterAction, {});

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state]);

  function keepChapterOpen(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="chapter-controls" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={(event) => { keepChapterOpen(event); dialogRef.current?.showModal(); }} aria-label="Изменить главу" title="Изменить"><Pencil size={15} /></button>
      <Dialog className="question-dialog" panelClassName="question-dialog__panel" ref={dialogRef} title="Изменить главу" eyebrow="Структура книги" onClick={(event) => event.stopPropagation()}>
        <form action={formAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="chapterId" value={chapterId} />
          <label htmlFor={`chapter-${chapterId}`}>Название главы</label>
          <input id={`chapter-${chapterId}`} name="title" defaultValue={title} maxLength={200} required autoFocus />
          <FormFeedback error={state.error} />
          <DialogActions submitLabel="Сохранить" />
        </form>
      </Dialog>
    </div>
  );
}
