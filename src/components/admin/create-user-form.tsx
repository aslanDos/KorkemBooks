"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { createUserAction, type CreateUserState } from "@/app/admin/users/actions";
import { PhoneField } from "@/components/auth/phone-field";
import type { BookType } from "@/lib/books/types";
import { isBookTypeReady } from "@/lib/books/catalog";
import { BOOK_LANGUAGES } from "@/lib/books/language";

const initialState: CreateUserState = {};
export function CreateUserForm({ bookTypes, allowManagerRole = true }: { bookTypes: BookType[]; allowManagerRole?: boolean }) {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  const [copied, setCopied] = useState(false);
  const [role, setRole] = useState<"user" | "manager">("user");
  if (state.invitation) return <div className="credentials-card"><span><Check size={24} /></span><h2>Аккаунт создан</h2><p>Передайте эту ссылку пользователю. По ней он самостоятельно создаст пароль. Ссылка действует 7 дней и только один раз.</p><div><small>Логин</small><b>{state.invitation.login}</b><small>Ссылка-приглашение</small><code>{state.invitation.url}</code></div><button type="button" onClick={async () => { await navigator.clipboard.writeText(state.invitation?.url ?? ""); setCopied(true); }}><Copy size={16} />{copied ? "Ссылка скопирована" : "Скопировать ссылку"}</button></div>;
  return <form className="admin-create-form" action={action}>
    <PhoneField id="phone" name="phone" label="Номер телефона" required />
    {allowManagerRole ? <fieldset><legend>Роль аккаунта</legend><label><input type="radio" name="role" value="user" checked={role === "user"} onChange={() => setRole("user")} /><span><b>Пользователь</b><small>Создаёт и редактирует свою книгу</small></span></label><label><input type="radio" name="role" value="manager" checked={role === "manager"} onChange={() => setRole("manager")} /><span><b>Менеджер</b><small>Работает с заказами и клиентами</small></span></label></fieldset> : <input type="hidden" name="role" value="user" />}
    {role === "user" && <fieldset><legend>Тип получателя</legend><div className="book-type-grid">{bookTypes.map((type) => { const isReady = isBookTypeReady(type); return <label className={isReady ? "" : "book-type-option--disabled"} key={type.id}><input type="radio" name="bookTypeId" value={type.id} disabled={!isReady} required /><span><b>{type.name}</b><small>{isReady ? `${type.questionCount} вопросов` : "Скоро"}</small></span></label>; })}</div></fieldset>}
    {role === "user" && <fieldset><legend>Язык книги</legend><div className="book-language-grid">{BOOK_LANGUAGES.map((language) => <label key={language.value}><input type="radio" name="bookLanguage" value={language.value} defaultChecked={language.value === "ru"} required /><span><b>{language.label}</b></span></label>)}</div></fieldset>}
    {state.error && <p className="admin-form-error">{state.error}</p>}
    <button className="primary-button" disabled={pending}><UserPlus size={17} />{pending ? "Создаём…" : "Создать и получить ссылку"}</button>
  </form>;
}
