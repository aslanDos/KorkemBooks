"use client";

import { useActionState } from "react";
import { createBookAction } from "@/app/dashboard/books/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormField } from "@/components/ui/form-field";
import type { BookType } from "@/lib/books/types";

export function CreateBookForm({ bookTypes }: { bookTypes: BookType[] }) {
  const [state, formAction] = useActionState(createBookAction, {});
  const firstReadyType = bookTypes.find((type) => type.questionCount > 0);

  return (
    <form className="book-form" action={formAction}>
      <FormField id="title" name="title" label="Название книги" placeholder="Наша история" maxLength={200} required />
      <FormField id="authorName" name="authorName" label="Автор" placeholder="Ваше имя" maxLength={120} autoComplete="name" required />
      <FormField id="recipientName" name="recipientName" label="Получатель" placeholder="Имя получателя" maxLength={120} />
      <fieldset className="book-type-fieldset">
        <legend>Для кого эта книга? <span aria-hidden="true">*</span></legend>
        <p>Для начала подойдут 4 готовые главы со 100 вопросами. Если вашей истории будет удобнее другая структура, вопросы можно перенести, а главы — изменить или добавить.</p>
        <div className="book-type-grid">
          {bookTypes.map((type) => {
            const isReady = type.questionCount > 0;
            return <label className={`book-type-option${isReady ? "" : " book-type-option--disabled"}`} key={type.id}><input type="radio" name="typeId" value={type.id} defaultChecked={type.id === firstReadyType?.id} disabled={!isReady} required /><span><strong>{type.name}</strong><small>{isReady ? `${type.chapterCount} глав · ${type.questionCount} вопросов` : "Скоро"}</small></span></label>;
          })}
        </div>
      </fieldset>
      <FormFeedback error={state.error} />
      <SubmitButton>Создать книгу</SubmitButton>
    </form>
  );
}
