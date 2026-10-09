"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { BookWritingStylePicker } from "@/components/books/book-writing-style-picker";
import type { BookWritingStyle } from "@/lib/books/writing-style";
import type { BookGender } from "@/lib/books/personalization";
import { BookPersonalizationFields } from "@/components/books/book-personalization-fields";

type EditBookFormProps = {
  bookId: string;
  title: string;
  authorName: string;
  recipientName: string;
  bookType: string;
  bookLanguage: string;
  writingStyle: BookWritingStyle;
  authorGender: BookGender | null;
  recipientGender: BookGender | null;
  backCoverText: string;
};

export function EditBookForm({ bookId, title, authorName, recipientName, bookType, bookLanguage, writingStyle, authorGender, recipientGender, backCoverText }: EditBookFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateBookAction, {});

  useEffect(() => {
    if (state.success) router.replace(`/dashboard/books/${bookId}`);
  }, [bookId, router, state.success]);

  return (
    <form className="book-form" action={formAction}>
      <input type="hidden" name="bookId" value={bookId} />
      <FormField id="edit-title" name="title" label="Название книги" defaultValue={title} maxLength={200} required />
      <FormField id="edit-author" name="authorName" label="Автор" defaultValue={authorName} maxLength={120} required />
      <FormField id="edit-recipient" name="recipientName" label="Получатель" defaultValue={recipientName} maxLength={120} />
      <FormField id="edit-book-type" label="Тип получателя" value={bookType} readOnly aria-readonly="true" />
      <FormField id="edit-book-language" label="Язык книги" value={bookLanguage} readOnly aria-readonly="true" />
      <BookPersonalizationFields authorGender={authorGender} recipientGender={recipientGender} backCoverText={backCoverText} />
      <BookWritingStylePicker defaultValue={writingStyle} />
      <FormFeedback error={state.error} />
      <SubmitButton pendingLabel="Сохраняем…">Сохранить изменения</SubmitButton>
    </form>
  );
}
