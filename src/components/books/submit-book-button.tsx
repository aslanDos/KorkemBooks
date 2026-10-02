"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { submitBookForEditingAction } from "@/app/dashboard/books/actions";
import { useLocale } from "@/components/locale/locale-provider";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormFeedback } from "@/components/ui/form-feedback";

export function SubmitBookButton({ bookId, progress }: { bookId: string; progress: number }) {
  const canSubmit = progress >= 50;
  const { locale } = useLocale();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(submitBookForEditingAction, {});
  const submitLabel = locale === "kk" ? "Редакциялауға жіберу" : "Отправить на редактуру";

  useEffect(() => {
    if (!state.success) return;
    dialogRef.current?.close();
    router.refresh();
  }, [router, state.success]);

  return (
    <div className="submit-book-form">
      <button
        className="secondary-content-button"
        type="button"
        disabled={!canSubmit}
        title={canSubmit ? undefined : locale === "kk" ? "Кітапта кемінде 50 бет болуы керек" : "В книге должно быть минимум 50 страниц"}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Send size={15} />
        {submitLabel}
      </button>
      <Dialog
        ref={dialogRef}
        className="submit-book-dialog"
        panelClassName="submit-book-dialog__panel"
        eyebrow={locale === "kk" ? "Келесі кезең" : "Следующий этап"}
        title={locale === "kk" ? "Кітапты редакциялауға жіберу керек пе?" : "Отправить книгу на редактуру?"}
      >
        <div className="submit-book-dialog__notice">
          <span><Send size={20} aria-hidden="true" /></span>
          <p>{locale === "kk" ? "Жібергеннен кейін кітап пен жауаптарды редакциялау қолжетімсіз болады. Редактор мазмұнды тексеріп, кітапты келісуге дайындайды." : "После отправки редактирование книги и ответов станет недоступно. Редактор проверит содержание и подготовит книгу к согласованию."}</p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="bookId" value={bookId} />
          <FormFeedback error={state.error} />
          <div className="submit-book-dialog__actions">
            <button type="button" onClick={() => dialogRef.current?.close()}>{locale === "kk" ? "Бас тарту" : "Отмена"}</button>
            <SubmitButton pendingLabel={locale === "kk" ? "Жіберілуде…" : "Отправляем…"}><Send size={15} aria-hidden="true" />{submitLabel}</SubmitButton>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
