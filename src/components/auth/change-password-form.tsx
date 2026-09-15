"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";
import { PasswordField } from "./password-field";
import { FormFeedback } from "@/components/ui/form-feedback";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {});

  return (
    <form className="settings-password-form" action={action}>
      <PasswordField id="password" label="Новый пароль" autoComplete="new-password" />
      <PasswordField id="passwordConfirmation" label="Повторите новый пароль" autoComplete="new-password" />
      <FormFeedback error={state.error} />
      {state.success && <p className="auth-success"><Check size={16} />{state.success}</p>}
      <button className="primary-button" disabled={pending}>{pending ? "Сохраняем…" : "Изменить пароль"}</button>
    </form>
  );
}
