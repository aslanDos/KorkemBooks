"use client";

import { useState } from "react";
import { submitQuestionSuggestionAction } from "@/app/dashboard/books/suggestion-actions";

export function QuestionSuggestionForm({ bookId, questionId, prompt, alreadyPending = false }: { bookId: string; questionId: string; prompt: string; alreadyPending?: boolean }) {
  const [open, setOpen] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState(prompt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await submitQuestionSuggestionAction({ bookId, questionId, suggestedPrompt });
      if (result.error) setError(result.error);
      else { setSent(true); setOpen(false); }
    } catch {
      setError("Не удалось отправить предложение. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <div className="question-suggestion-form">
    {alreadyPending ? <p role="status">Ваше предложение по этому вопросу ожидает рассмотрения.</p> : sent ? <p role="status">Спасибо! Ваш вариант отправлен на рассмотрение. Текущий вопрос пока не изменился.</p> : <>
      <button type="button" className="question-suggestion-form__toggle" aria-expanded={open} onClick={() => { setOpen(!open); setError(""); }}>Предложить исправление вопроса</button>
      {open && <div className="question-suggestion-form__body">
        <label htmlFor={`suggest-question-${questionId}`}>Как должен звучать вопрос?</label>
        <textarea id={`suggest-question-${questionId}`} value={suggestedPrompt} maxLength={1000} onChange={(event) => setSuggestedPrompt(event.target.value)} />
        <small>Предложение увидит команда. Вопрос изменится только после проверки и только в вашей книге.</small>
        <button type="button" disabled={pending || !suggestedPrompt.trim() || suggestedPrompt.trim() === prompt.trim()} onClick={() => void submit()}>{pending ? "Отправляем…" : "Отправить предложение"}</button>
      </div>}
    </>}
    {error && <p role="alert" className="admin-form-error">{error}</p>}
  </div>;
}
