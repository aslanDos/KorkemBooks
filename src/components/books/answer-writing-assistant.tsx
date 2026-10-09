"use client";

import { useRef, useState } from "react";
import { Check, PenLine, Sparkles, SpellCheck2 } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { Dialog } from "@/components/ui/dialog";
import { BOOK_WRITING_STYLE_COPY, type BookWritingStyle } from "@/lib/books/writing-style";

type EditingMode = "proofread" | "improve";

const COPY = {
  ru: {
    assistant: "Помощь с текстом",
    proofread: "Исправить ошибки",
    proofreadDescription: "Исправим орфографию и пунктуацию, не меняя ваши слова и интонацию.",
    improveDescription: "Уберём повторы и сделаем рассказ более связным, не добавляя новых фактов.",
    empty: "Сначала напишите ответ своими словами.",
    prototype: "Демонстрационный вариант — ИИ пока не подключён",
    original: "Ваш текст",
    suggestion: "Предложенная версия",
    editHint: "Можно поправить текст перед применением.",
    keep: "Оставить оригинал",
    accept: "Принять изменения",
  },
  kk: {
    assistant: "Мәтінмен жұмыс істеуге көмек",
    proofread: "Қателерді түзету",
    proofreadDescription: "Сөздеріңіз бен мәнеріңізді өзгертпей, емле және тыныс белгілерін түзетеміз.",
    improveDescription: "Жаңа деректер қоспай, қайталауларды алып тастап, әңгімені бірізді етеміз.",
    empty: "Алдымен жауабыңызды өз сөзіңізбен жазыңыз.",
    prototype: "Демонстрациялық нұсқа — ЖИ әзірге қосылмаған",
    original: "Сіздің мәтініңіз",
    suggestion: "Ұсынылған нұсқа",
    editHint: "Қолданар алдында мәтінді түзетуге болады.",
    keep: "Бастапқы нұсқаны қалдыру",
    accept: "Өзгерістерді қабылдау",
  },
};

export function AnswerWritingAssistant({ value, writingStyle, disabled = false, onApply }: { value: string; writingStyle: BookWritingStyle; disabled?: boolean; onApply: (value: string) => void }) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const styleCopy = BOOK_WRITING_STYLE_COPY[locale][writingStyle];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<EditingMode>("proofread");
  const [original, setOriginal] = useState("");
  const [suggestion, setSuggestion] = useState("");

  function open(nextMode: EditingMode) {
    const source = value.trim();
    if (!source) return;
    setMode(nextMode);
    setOriginal(source);
    setSuggestion(createPrototypeSuggestion(source, nextMode));
    dialogRef.current?.showModal();
  }

  function applySuggestion() {
    onApply(suggestion.trim());
    dialogRef.current?.close();
  }

  return <>
    <div className="answer-writing-assistant" aria-label={copy.assistant}>
      <button className="answer-writing-assistant__action" type="button" title={value.trim() ? copy.proofreadDescription : copy.empty} disabled={disabled || !value.trim()} onClick={() => open("proofread")}>
        <SpellCheck2 size={16} aria-hidden="true" />
        <span>{copy.proofread}</span>
      </button>
      <button className="answer-writing-assistant__action" type="button" title={value.trim() ? styleCopy.assistant : copy.empty} disabled={disabled || !value.trim()} onClick={() => open("improve")}>
        <PenLine size={16} aria-hidden="true" />
        <span>{styleCopy.label}</span>
      </button>
    </div>

    <Dialog
      ref={dialogRef}
      className="answer-assistant-dialog"
      panelClassName="answer-assistant-dialog__panel"
      eyebrow={copy.assistant}
      title={mode === "proofread" ? copy.proofread : styleCopy.label}
    >
      <p className="answer-assistant-dialog__description">{mode === "proofread" ? copy.proofreadDescription : copy.improveDescription}</p>
      <p className="answer-assistant-dialog__prototype"><Sparkles size={14} aria-hidden="true" />{copy.prototype}</p>
      <div className="answer-assistant-comparison">
        <section>
          <span>{copy.original}</span>
          <p>{original}</p>
        </section>
        <section className="answer-assistant-comparison__suggestion">
          <label htmlFor="answer-assistant-suggestion">{copy.suggestion}</label>
          <textarea id="answer-assistant-suggestion" value={suggestion} onChange={(event) => setSuggestion(event.target.value)} />
          <small>{copy.editHint}</small>
        </section>
      </div>
      <footer className="answer-assistant-dialog__actions">
        <button type="button" onClick={() => dialogRef.current?.close()}>{copy.keep}</button>
        <button type="button" disabled={!suggestion.trim()} onClick={applySuggestion}><Check size={16} aria-hidden="true" />{copy.accept}</button>
      </footer>
    </Dialog>
  </>;
}

function createPrototypeSuggestion(value: string, mode: EditingMode) {
  const cleaned = value
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const capitalized = cleaned.replace(/(^|[.!?]\s+|\n+)(\p{Ll})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("kk-KZ")}`);
  const punctuated = /[.!?…]$/u.test(capitalized) ? capitalized : `${capitalized}.`;
  if (mode === "proofread") return punctuated;
  return punctuated
    .replace(/\bа потом\b/giu, "затем")
    .replace(/\bпотом\b/giu, "затем")
    .replace(/\bочень очень\b/giu, "очень");
}
