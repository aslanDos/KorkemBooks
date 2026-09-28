"use client";

import { useState } from "react";
import Link from "next/link";
import { submitQuestionSuggestionAction } from "@/app/dashboard/books/suggestion-actions";

export function QuestionSuggestionForm({ bookId, questionId, prompt, suggestion }: { bookId: string; questionId: string; prompt: string; suggestion?: { status: string; review_comment: string | null } }) {
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
    {suggestion?.status === "pending" || sent ? <p role="status">Ваше предложение по этому вопросу на рассмотрении. <Link href="/dashboard/my-suggestions">Все исправления</Link></p> : <>
      {suggestion && <p className="question-suggestion-form__result" role="status">Предыдущее предложение: {suggestion.status === "approved" ? "принято" : "отклонено"}. {suggestion.review_comment && <span>Комментарий: {suggestion.review_comment} </span>}<Link href="/dashboard/my-suggestions">История исправлений</Link></p>}
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
