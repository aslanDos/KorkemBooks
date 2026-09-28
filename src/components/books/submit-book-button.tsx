"use client";

import { Send } from "lucide-react";
import { submitBookForEditingAction } from "@/app/dashboard/books/actions";
import { useLocale } from "@/components/locale/locale-provider";

export function SubmitBookButton({ bookId, progress }: { bookId: string; progress: number }) {
  const canSubmit = progress >= 50;
  const { locale } = useLocale();

  return (
    <form
      className="submit-book-form"
      action={submitBookForEditingAction}
      onSubmit={event => {
        const confirmation = locale === "kk"
          ? "Жібергеннен кейін кітапты өңдеу қолжетімсіз болады. Кітап редакциялауға жіберілсін бе?"
          : "После отправки редактирование будет недоступно. Отправить книгу на редактуру?";
        if (!canSubmit || !window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <input type="hidden" name="bookId" value={bookId} />
      <button
        className="secondary-content-button"
        type="submit"
        disabled={!canSubmit}
        title={canSubmit ? undefined : locale === "kk" ? "Кітапта кемінде 50 бет болуы керек" : "В книге должно быть минимум 50 страниц"}
      >
        <Send size={15} />
        {locale === "kk" ? "Редакциялауға жіберу" : "Отправить на редактуру"}
      </button>
    </form>
  );
}
