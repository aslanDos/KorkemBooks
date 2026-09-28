"use client";

import { Check, KeyRound } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { changePasswordAction } from "@/app/dashboard/settings/actions";
import { PasswordField } from "./password-field";
import { FormFeedback } from "@/components/ui/form-feedback";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const formId = useId();

  return <div className="settings-password-control">
    <button type="button" className="settings-password-toggle" aria-expanded={open} aria-controls={open ? formId : undefined} onClick={() => setOpen((value) => !value)}><KeyRound size={17} />{open ? "Скрыть форму" : "Изменить пароль"}</button>
    {open && <PasswordEditorForm id={formId} />}
  </div>;
}

function PasswordEditorForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} id={id} className="settings-password-form" action={action}>
      <p>Используйте не менее восьми символов.</p>
      <PasswordField id="currentPassword" label="Текущий пароль" autoComplete="current-password" />
      <PasswordField id="password" label="Новый пароль" autoComplete="new-password" />
      <PasswordField id="passwordConfirmation" label="Повторите новый пароль" autoComplete="new-password" />
      <FormFeedback error={state.error} />
      {state.success && <p className="auth-success"><Check size={16} />{state.success}</p>}
      <button className="primary-button" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить новый пароль"}</button>
    </form>
  );
}
