"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { saveAdminAnswerAction } from "@/app/admin/books/[bookId]/actions";

export function AdminAnswerForm({ bookId, questionId, prompt, answer, promptEditedByOwner = false, readOnly = false }: { bookId: string; questionId: string; prompt: string; answer: string; promptEditedByOwner?: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(answer);
  const [savedAnswer, setSavedAnswer] = useState(answer);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await saveAdminAnswerAction({}, new FormData(event.currentTarget));
      if (result.error) { setError(result.error); return; }
      setSavedAnswer(draft.trim());
      setEditing(false);
      router.refresh();
    } catch {
      setError("Не удалось сохранить ответ. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <article className="admin-answer-form">
    <div className="admin-answer-form__heading">
      <div><h4>{prompt}</h4>{promptEditedByOwner && <span className="admin-answer-form__owner-edit">Изменено пользователем</span>}</div>
      {!readOnly && !editing && <button className="admin-answer-form__edit" type="button" onClick={() => { setDraft(savedAnswer); setError(""); setEditing(true); }}>Изменить</button>}
    </div>
    {editing ? <form onSubmit={(event) => void save(event)}>
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="questionId" value={questionId} />
      <label className="visually-hidden" htmlFor={`answer-${questionId}`}>Ответ на вопрос: {prompt}</label>
      <textarea id={`answer-${questionId}`} name="answerText" value={draft} onChange={(event) => setDraft(event.target.value)} rows={Math.max(4, Math.min(12, Math.ceil(draft.length / 110)))} disabled={pending} />
      <div className="admin-answer-form__actions"><span role={error ? "alert" : "status"}>{error}</span><button className="admin-answer-form__cancel" type="button" disabled={pending} onClick={() => { setDraft(savedAnswer); setEditing(false); setError(""); }}>Отмена</button><button type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Сохранить</button></div>
    </form> : <p className="admin-answer-form__answer">{savedAnswer}</p>}
  </article>;
}
