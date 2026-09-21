"use client";

import { useActionState } from "react";
import { assignUserBookTypeAction, type AssignBookTypeState } from "@/app/admin/users/actions";
import type { BookType } from "@/lib/books/types";

const initialState: AssignBookTypeState = {};

export function AssignBookTypeForm({ userId, bookTypes }: { userId: string; bookTypes: BookType[] }) {
  const [state, action, pending] = useActionState(assignUserBookTypeAction, initialState);

  if (state.success) return <span className="admin-assigned-type">Тип назначен</span>;

  return (
    <form action={action} className="admin-assign-type-form">
      <input type="hidden" name="userId" value={userId} />
      <select name="bookTypeId" defaultValue="" required aria-label="Тип получателя">
        <option value="" disabled>Выберите тип</option>
        {bookTypes.filter((type) => type.questionCount === 100).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
      </select>
      <button type="submit" disabled={pending}>{pending ? "Назначаем…" : "Назначить"}</button>
      {state.error && <small>{state.error}</small>}
    </form>
  );
}
