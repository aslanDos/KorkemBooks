"use client";

import { useActionState } from "react";
import { createBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormField } from "@/components/ui/form-field";
import { BOOK_LANGUAGES } from "@/lib/books/language";
import type { BookType } from "@/lib/books/types";

export function CreateBookForm({ adminBookTypes }: { adminBookTypes?: Pick<BookType, "id" | "name">[] }) {
  const [state, formAction] = useActionState(createBookAction, {});

  return (
    <form className="book-form" action={formAction}>
      <FormField id="title" name="title" label="Название книги" placeholder="Наша история" maxLength={200} required />
      <FormField id="authorName" name="authorName" label="Автор" placeholder="Ваше имя" maxLength={120} autoComplete="name" required />
      <FormField id="recipientName" name="recipientName" label="Получатель" placeholder="Имя получателя" maxLength={120} />
      {adminBookTypes && <div className="form-field">
        <div className="form-field__header"><label htmlFor="typeId">Тип получателя <span aria-hidden="true">*</span></label></div>
        <div className="form-field__control"><select id="typeId" name="typeId" defaultValue="" required><option value="" disabled>Выберите тип получателя</option>{adminBookTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
      </div>}
      {adminBookTypes && <div className="form-field">
        <div className="form-field__header"><label htmlFor="language">Язык книги <span aria-hidden="true">*</span></label></div>
        <div className="form-field__control"><select id="language" name="language" defaultValue="ru" required>{BOOK_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></div>
      </div>}
      <FormFeedback error={state.error} />
      <SubmitButton>Создать книгу</SubmitButton>
    </form>
  );
}
