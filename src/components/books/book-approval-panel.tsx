"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import { decideBookApprovalAction, type BookApprovalState } from "@/app/dashboard/books/approval-actions";

const initialState: BookApprovalState = {};

export function BookApprovalPanel({ bookId }: { bookId: string }) {
  const [state, action, pending] = useActionState(decideBookApprovalAction, initialState);
  return <section className="dashboard-section book-approval-panel" aria-labelledby="book-approval-title">
    <div><span className="book-approval-eyebrow">Ваше решение</span><h2 id="book-approval-title">Проверьте книгу перед печатью</h2><p>Посмотрите страницы. После подтверждения макет перейдёт в печать, а изменить его можно будет только через новую редактуру и согласование.</p></div>
    <nav aria-label="Проверка макета"><Link className="secondary-content-button" href={`/dashboard/books/${bookId}/preview`}>Посмотреть страницы</Link></nav>
    <form action={action}>
      <input type="hidden" name="bookId" value={bookId} />
      <label htmlFor="book-approval-feedback">Если нужны правки, опишите их для редактора</label>
      <textarea id="book-approval-feedback" name="feedback" maxLength={2000} rows={3} placeholder="Например, исправить имя на обложке или текст на странице…" />
      <div><button className="content-primary-button" type="submit" name="decision" value="approved" disabled={pending}><Check size={16} />{pending ? "Сохраняем…" : "Подтвердить и отправить в печать"}</button><button className="secondary-content-button" type="submit" name="decision" value="changes_requested" disabled={pending}><MessageSquareText size={16} />Запросить правки</button></div>
      {state.error && <p role="alert" className="admin-form-error">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  </section>;
}
