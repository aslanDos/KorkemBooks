"use client";

import { Check } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { BOOK_WRITING_STYLE_COPY, BOOK_WRITING_STYLE_VALUES, DEFAULT_BOOK_WRITING_STYLE, type BookWritingStyle } from "@/lib/books/writing-style";

export function BookWritingStylePicker({ defaultValue = DEFAULT_BOOK_WRITING_STYLE }: { defaultValue?: BookWritingStyle }) {
  const { locale } = useLocale();
  const copy = BOOK_WRITING_STYLE_COPY[locale];

  return <fieldset className="book-writing-style-picker">
    <legend>{locale === "kk" ? "Кітабыңыз қалай естілгенін қалайсыз?" : "Как должна звучать ваша книга?"}</legend>
    <p>{locale === "kk" ? "Стиль мәтінді жақсарту кезінде қолданылады. Оны кейін өзгертуге болады." : "Стиль будет использоваться при улучшении текста. Его можно изменить позже."}</p>
    <div>{BOOK_WRITING_STYLE_VALUES.map((style) => <label key={style}>
      <input type="radio" name="writingStyle" value={style} defaultChecked={style === defaultValue} required />
      <span>
        <span><strong>{copy[style].label}</strong>{style === DEFAULT_BOOK_WRITING_STYLE && <small>{locale === "kk" ? "Ұсынылады" : "Рекомендуем"}</small>}</span>
        <span className="book-writing-style-picker__description"><em>{copy[style].description}</em><Check size={17} aria-hidden="true" /></span>
      </span>
    </label>)}</div>
  </fieldset>;
}
