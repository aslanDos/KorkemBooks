"use client";

import { useActionState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { saveAdminAnswerAction, type AdminAnswerState } from "@/app/admin/books/[bookId]/actions";

const initialState: AdminAnswerState = {};
export function AdminAnswerForm({ bookId, questionId, prompt, answer }: { bookId: string; questionId: string; prompt: string; answer: string }) {
  const [state, action, pending] = useActionState(saveAdminAnswerAction, initialState);
  return <form action={action} className="admin-answer-form"><input type="hidden" name="bookId" value={bookId} /><input type="hidden" name="questionId" value={questionId} /><label htmlFor={`answer-${questionId}`}>{prompt}</label><textarea id={`answer-${questionId}`} name="answerText" defaultValue={answer} rows={Math.max(4, Math.min(12, Math.ceil(answer.length / 110)))} /><div><span role="status">{state.error ?? (state.success ? "Сохранено" : "")}</span><button type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}Сохранить</button></div></form>;
}
