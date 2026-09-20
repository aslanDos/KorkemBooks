"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useActionState, useState } from "react";
import { resetUserPasswordAction, type ResetPasswordState } from "@/app/admin/users/actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordButton({ userId, phone }: { userId: string; phone: string | null }) {
  const [state, action, pending] = useActionState(resetUserPasswordAction, initialState);
  const [copied, setCopied] = useState(false);

  if (!phone) return <span className="admin-muted-action">Нет телефона</span>;

  if (state.resetLink) {
    return (
      <div className="admin-reset-result">
        <span><Check size={13} />Ссылка готова</span>
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(state.resetLink?.url ?? ""); setCopied(true); }}>
          <Copy size={13} />{copied ? "Скопировано" : "Копировать ссылку"}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="admin-reset-form">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending}><KeyRound size={14} />{pending ? "Создаём ссылку…" : "Сбросить пароль"}</button>
      {state.error && <small>{state.error}</small>}
    </form>
  );
}
