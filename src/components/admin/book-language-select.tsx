"use client";

import { ChevronDown } from "lucide-react";
import { updateBookLanguageAction } from "@/app/admin/books/[bookId]/actions";
import { BOOK_LANGUAGES } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

export function BookLanguageSelect({ bookId, language }: { bookId: string; language: BookLanguage }) {
  return (
    <form action={updateBookLanguageAction} className="book-status-control">
      <input type="hidden" name="bookId" value={bookId} />
      <select className="book-status-select" name="language" defaultValue={language} onChange={(event) => event.currentTarget.form?.requestSubmit()} aria-label="Язык книги">
        {BOOK_LANGUAGES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </form>
  );
}
