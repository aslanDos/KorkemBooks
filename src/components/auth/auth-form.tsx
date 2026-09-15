"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/auth/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordField } from "./password-field";
import { PhoneField } from "./phone-field";

export function AuthForm() {
  const [state, formAction] = useActionState(signInAction, {});

  return (
    <form className="auth-form" action={formAction}>
      <PhoneField id="login" name="login" label="Номер телефона" required />
      <PasswordField id="password" label="Пароль" autoComplete="current-password" hint={<span className="auth-password-help">Сброс — через администратора</span>} />
      <FormFeedback error={state.error} />
      <SubmitButton>Войти</SubmitButton>
    </form>
  );
}
