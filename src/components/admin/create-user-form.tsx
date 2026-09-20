"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { createUserAction, type CreateUserState } from "@/app/admin/users/actions";
import { PhoneField } from "@/components/auth/phone-field";

const initialState: CreateUserState = {};
export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const [copied, setCopied] = useState(false);
  if (state.invitation) return <div className="credentials-card"><span><Check size={24} /></span><h2>Аккаунт создан</h2><p>Передайте эту ссылку пользователю. По ней он самостоятельно создаст пароль. Ссылка действует 7 дней и только один раз.</p><div><small>Логин</small><b>{state.invitation.login}</b><small>Ссылка-приглашение</small><code>{state.invitation.url}</code></div><button type="button" onClick={async () => { await navigator.clipboard.writeText(state.invitation?.url ?? ""); setCopied(true); }}><Copy size={16} />{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button></div>;
  return <form className="admin-create-form" action={action}>
    <div className="form-field"><label htmlFor="displayName">Имя</label><div className="form-field__control"><input id="displayName" name="displayName" required placeholder="Например, Алина Садыкова" /></div></div>
    <PhoneField id="phone" name="phone" label="Номер телефона" required />
    <fieldset><legend>Роль аккаунта</legend><label><input type="radio" name="role" value="user" defaultChecked /><span><b>Пользователь</b><small>Создаёт и редактирует свои книги</small></span></label><label><input type="radio" name="role" value="manager" /><span><b>Менеджер</b><small>Работает с заказами и клиентами</small></span></label></fieldset>
    {state.error && <p className="admin-form-error">{state.error}</p>}
    <button className="primary-button" disabled={pending}><UserPlus size={17} />{pending ? "Создаём…" : "Создать и получить ссылку"}</button>
  </form>;
}
