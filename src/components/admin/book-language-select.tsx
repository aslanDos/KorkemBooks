"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updateBookLanguageAction } from "@/app/admin/books/[bookId]/actions";
import { BOOK_LANGUAGES, isBookLanguage } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

export function BookLanguageSelect({ bookId, language }: { bookId: string; language: BookLanguage }) {
  const router = useRouter();
  const [selected, setSelected] = useState(language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function changeLanguage(value: string) {
    if (!isBookLanguage(value) || value === selected || saving) return;
    setSelected(value);
    setSaving(true);
    setError("");
    try {
      const result = await updateBookLanguageAction(bookId, value);
      if (result.error) {
        setSelected(language);
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setSelected(language);
      setError("Не удалось сохранить язык. Попробуйте ещё раз");
    } finally {
      setSaving(false);
    }
  }

  return <div className="book-language-control">
    <div className="book-status-control">
      <select className="book-status-select" value={selected} disabled={saving} onChange={(event) => void changeLanguage(event.currentTarget.value)} aria-label="Язык книги" aria-describedby={error ? "book-language-error" : undefined}>
        {BOOK_LANGUAGES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </div>
    {saving && <span className="book-language-control__message" role="status">Сохраняем язык…</span>}
    {error && <span className="book-language-control__message book-language-control__message--error" id="book-language-error" role="alert">{error}</span>}
  </div>;
}
