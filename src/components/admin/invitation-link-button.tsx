"use client";

import { Copy, Link2 } from "lucide-react";
import { useActionState, useState } from "react";
import { createInvitationLinkAction, type InvitationLinkState } from "@/app/admin/users/actions";

const initialState: InvitationLinkState = {};

export function InvitationLinkButton({ userId, phone }: { userId: string; phone: string | null }) {
  const [state, action, pending] = useActionState(createInvitationLinkAction, initialState);
  const [copied, setCopied] = useState(false);

  if (!phone) return <span className="admin-muted-action">Нет телефона</span>;

  if (state.invitationLink) {
    return (
      <div className="admin-reset-result">
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(state.invitationLink?.url ?? ""); setCopied(true); }}>
          <Copy size={13} />{copied ? "Скопировано" : "Копировать ссылку"}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="admin-reset-form">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending}><Link2 size={14} />{pending ? "Создаём ссылку…" : "Получить приглашение"}</button>
      {state.error && <small>{state.error}</small>}
    </form>
  );
}
