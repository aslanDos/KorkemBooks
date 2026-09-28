"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { requestBookApprovalAction, type BookApprovalState } from "@/app/dashboard/books/approval-actions";

const initialState: BookApprovalState = {};

export function SendBookForApproval({ bookId }: { bookId: string }) {
  const [state, action, pending] = useActionState(requestBookApprovalAction, initialState);
  return <form action={action} className="book-approval-send">
    <input type="hidden" name="bookId" value={bookId} />
    <p>Сначала сохраните все правки текста и обложки. Когда макет готов, отправьте книгу автору: до его решения содержимое будет защищено от изменений.</p>
    <button className="content-primary-button" type="submit" disabled={pending}><Send size={16} />{pending ? "Отправляем…" : "Отправить на согласование"}</button>
    {state.error && <p role="alert" className="admin-form-error">{state.error}</p>}
    {state.success && <p role="status">{state.success}</p>}
  </form>;
}
