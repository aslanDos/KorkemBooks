"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordField } from "./password-field";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, {});
  return (
    <form className="auth-form" action={formAction}>
      <PasswordField id="password" label="Новый пароль" autoComplete="new-password" />
      <FormFeedback error={state.error} />
      <SubmitButton>Сохранить пароль</SubmitButton>
    </form>
  );
}
