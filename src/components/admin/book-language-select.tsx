"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Languages } from "lucide-react";
import { updateBookLanguageAction } from "@/app/admin/books/[bookId]/actions";
import { Dialog } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { BOOK_LANGUAGES } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

export function BookLanguageSelect({ bookId, language, disabled = false }: { bookId: string; language: BookLanguage; disabled?: boolean }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(language);
  const [pendingLanguage, setPendingLanguage] = useState<"ru" | "kk" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function requestLanguageChange(value: string) {
    if ((value !== "ru" && value !== "kk") || value === selected || saving) return;
    setSelected(value as BookLanguage);
    setPendingLanguage(value);
    setError("");
    dialogRef.current?.showModal();
  }

  function cancelLanguageChange() {
    if (saving) return;
    setSelected(language);
    setPendingLanguage(null);
    setError("");
    dialogRef.current?.close();
  }

  async function confirmLanguageChange() {
    if (!pendingLanguage || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateBookLanguageAction(bookId, pendingLanguage);
      if (result.error) {
        setError(result.error);
      } else {
        dialogRef.current?.close();
        setPendingLanguage(null);
        router.refresh();
      }
    } catch {
      setError("Не удалось сохранить язык. Попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  return <div className="book-language-control">
    <div className="book-status-control">
      <select className="book-status-select" value={selected} disabled={saving || disabled} onChange={(event) => requestLanguageChange(event.currentTarget.value)} aria-label="Язык книги">
        {language === "en" && <option value="en" disabled hidden>EN — English</option>}
        {BOOK_LANGUAGES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </div>
    <Dialog
      ref={dialogRef}
      className="submit-book-dialog"
      panelClassName="submit-book-dialog__panel"
      eyebrow="Язык книги"
      title={`Сменить язык на ${BOOK_LANGUAGES.find((option) => option.value === pendingLanguage)?.label ?? "выбранный"}?`}
      closeDisabled={saving}
      onCancel={(event) => {
        event.preventDefault();
        cancelLanguageChange();
      }}
    >
      <div className="submit-book-dialog__notice">
        <span><Languages size={20} aria-hidden="true" /></span>
        <p>Стандартные вопросы и названия глав будут переведены на выбранный язык. Ответы пользователя и изменённые вручную названия сохранятся.</p>
      </div>
      <FormFeedback error={error} />
      <div className="submit-book-dialog__actions">
        <button type="button" disabled={saving} onClick={cancelLanguageChange}>Отмена</button>
        <button className="primary-button" type="button" disabled={saving} onClick={() => void confirmLanguageChange()}>
          <Languages size={15} aria-hidden="true" />
          {saving ? "Сохраняем…" : "Сменить язык"}
        </button>
      </div>
    </Dialog>
  </div>;
}
