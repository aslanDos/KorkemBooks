"use client";

import { useState } from "react";
import type { BookGender } from "@/lib/books/personalization";

type BookPersonalizationFieldsProps = {
  authorGender?: BookGender | null;
  recipientGender?: BookGender | null;
  backCoverText?: string;
};

function GenderChoices({ name, label, value }: { name: string; label: string; value?: BookGender | null }) {
  const [selected, setSelected] = useState<BookGender | null>(value ?? null);
  return (
    <fieldset className="book-gender-field">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={selected ?? "neutral"} />
      <div className="book-gender-options" role="group" aria-label={label}>
        {[
          ["female", "В женском роде"],
          ["male", "В мужском роде"],
        ].map(([option, optionLabel]) => (
          <button
            key={option}
            type="button"
            aria-pressed={selected === option}
            className={selected === option ? "is-selected" : ""}
            onClick={() => setSelected((current) => current === option ? null : option as BookGender)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function BookPersonalizationFields({ authorGender, recipientGender, backCoverText = "" }: BookPersonalizationFieldsProps) {
  return (
    <section className="book-personalization-fields" aria-labelledby="book-personalization-heading">
      <div className="book-form-section-heading">
        <h3 id="book-personalization-heading">Обращение в тексте</h3>
        <p>Подскажите, какие формы слов использовать при упоминании автора и получателя — например, «написала» или «написал». Если ничего не выбирать, формулировки останутся нейтральными.</p>
      </div>
      <div className="book-gender-fields">
        <GenderChoices name="authorGender" label="Как обращаться к автору" value={authorGender} />
        <GenderChoices name="recipientGender" label="Как обращаться к получателю" value={recipientGender} />
      </div>
      <label className="book-back-cover-field" htmlFor="backCoverText">
        <span>Послание на задней стороне обложки</span>
        <small>Добавьте короткий текст для оборота книги. Это поле можно оставить пустым.</small>
        <textarea id="backCoverText" name="backCoverText" defaultValue={backCoverText} maxLength={1000} rows={6} placeholder="Например, несколько тёплых слов или небольшое посвящение…" />
      </label>
    </section>
  );
}
