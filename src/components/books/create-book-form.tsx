"use client";

import { useActionState } from "react";
import { createBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormField } from "@/components/ui/form-field";

export function CreateBookForm() {
  const [state, formAction] = useActionState(createBookAction, {});

  return (
    <form className="book-form" action={formAction}>
      <FormField id="title" name="title" label="Название книги" placeholder="Наша история" maxLength={200} required />
      <FormField id="authorName" name="authorName" label="Автор" placeholder="Ваше имя" maxLength={120} autoComplete="name" required />
      <FormField id="recipientName" name="recipientName" label="Получатель" placeholder="Имя получателя" maxLength={120} />
      <FormFeedback error={state.error} />
      <SubmitButton>Создать книгу</SubmitButton>
    </form>
  );
}
