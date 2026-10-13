"use client";

import { useActionState } from "react";
import { createBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormField } from "@/components/ui/form-field";
import { BOOK_LANGUAGES, getBookLanguageLabel } from "@/lib/books/language";
import type { BookEntitlement, BookType } from "@/lib/books/types";
import { BookWritingStylePicker } from "@/components/books/book-writing-style-picker";
import { BookPersonalizationFields } from "@/components/books/book-personalization-fields";

type CreateBookFormProps = {
  adminBookTypes?: Pick<BookType, "id" | "name">[];
  entitlements?: BookEntitlement[];
};

export function CreateBookForm({ adminBookTypes, entitlements }: CreateBookFormProps) {
  const [state, formAction] = useActionState(createBookAction, {});

  return (
    <form className="book-form" action={formAction}>
      <FormField id="title" name="title" label="Название книги" placeholder="Наша история" maxLength={200} required />
      <FormField id="authorName" name="authorName" label="Автор" placeholder="Ваше имя" maxLength={120} autoComplete="name" required />
      <FormField id="recipientName" name="recipientName" label="Получатель" placeholder="Имя получателя" maxLength={120} />
      {entitlements && <div className="form-field">
        <div className="form-field__header"><label htmlFor="entitlementId">Доступная книга <span aria-hidden="true">*</span></label></div>
        <div className="form-field__control"><select id="entitlementId" name="entitlementId" defaultValue={entitlements.length === 1 ? entitlements[0].id : ""} required>
          {entitlements.length > 1 && <option value="" disabled>Выберите книгу</option>}
          {entitlements.map((entitlement) => <option key={entitlement.id} value={entitlement.id}>{entitlement.typeName} · {getBookLanguageLabel(entitlement.language)}</option>)}
        </select></div>
      </div>}
      {adminBookTypes && <div className="form-field">
        <div className="form-field__header"><label htmlFor="typeId">Тип получателя <span aria-hidden="true">*</span></label></div>
        <div className="form-field__control"><select id="typeId" name="typeId" defaultValue="" required><option value="" disabled>Выберите тип получателя</option>{adminBookTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
      </div>}
      {adminBookTypes && <div className="form-field">
        <div className="form-field__header"><label htmlFor="language">Язык книги <span aria-hidden="true">*</span></label></div>
        <div className="form-field__control"><select id="language" name="language" defaultValue="ru" required>{BOOK_LANGUAGES.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}</select></div>
      </div>}
      <BookPersonalizationFields />
      <BookWritingStylePicker />
      <FormFeedback error={state.error} />
      <SubmitButton>Создать книгу</SubmitButton>
    </form>
  );
}
