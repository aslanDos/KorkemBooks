"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewQuestionSuggestionAction } from "@/app/dashboard/suggestions/actions";

export function SuggestionReviewForm({ id, suggestedPrompt }: { id: string; suggestedPrompt: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(suggestedPrompt);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function review(decision: "approved" | "rejected") {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await reviewQuestionSuggestionAction({ suggestionId: id, decision, finalPrompt: prompt, reviewComment: comment });
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError("Не удалось сохранить решение. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <div className="question-suggestion-review">
    <label htmlFor={`suggestion-${id}`}>Итоговая формулировка для этой книги</label>
    <textarea id={`suggestion-${id}`} value={prompt} maxLength={1000} onChange={(event) => setPrompt(event.target.value)} />
    <label htmlFor={`suggestion-comment-${id}`}>Комментарий пользователю (при отклонении обязателен)</label>
    <textarea id={`suggestion-comment-${id}`} value={comment} maxLength={1000} placeholder="Например, почему формулировка изменена или отклонена" onChange={(event) => setComment(event.target.value)} />
    <div><button type="button" disabled={pending || !prompt.trim()} onClick={() => void review("approved")}>{pending ? "Сохраняем…" : "Принять и исправить"}</button><button type="button" disabled={pending || !comment.trim()} onClick={() => void review("rejected")}>Отклонить</button></div>
    {error && <p role="alert" className="admin-form-error">{error}</p>}
  </div>;
}
