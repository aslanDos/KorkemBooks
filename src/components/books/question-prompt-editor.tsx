"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateQuestionPromptAction } from "@/app/dashboard/books/question-actions";

export function QuestionPromptEditor({ bookId, questionId, prompt }: { bookId: string; questionId: string; prompt: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(prompt);
  const [savedPrompt, setSavedPrompt] = useState(prompt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const normalized = draft.trim();
    if (pending || !normalized || normalized === savedPrompt.trim()) return;
    setPending(true);
    setError("");
    try {
      const result = await updateQuestionPromptAction({ bookId, questionId, prompt: normalized });
      if (result.error) { setError(result.error); return; }
      setDraft(normalized);
      setSavedPrompt(normalized);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Не удалось изменить вопрос. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <div className="question-prompt-editor">
    <button type="button" className="question-prompt-editor__toggle" aria-expanded={open} onClick={() => { setDraft(savedPrompt); setOpen(!open); setError(""); }}>Изменить вопрос</button>
    {open && <div className="question-prompt-editor__body">
      <label htmlFor={`edit-question-${questionId}`}>Текст вопроса</label>
      <textarea id={`edit-question-${questionId}`} value={draft} maxLength={1000} disabled={pending} onChange={(event) => setDraft(event.target.value)} />
      <div>
        <button type="button" className="question-prompt-editor__cancel" disabled={pending} onClick={() => { setDraft(savedPrompt); setOpen(false); setError(""); }}>Отмена</button>
        <button type="button" disabled={pending || !draft.trim() || draft.trim() === savedPrompt.trim()} onClick={() => void save()}>{pending ? "Сохраняем…" : "Сохранить"}</button>
      </div>
    </div>}
    {error && <p role="alert" className="admin-form-error">{error}</p>}
  </div>;
}
