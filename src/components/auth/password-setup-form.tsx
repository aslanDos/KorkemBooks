"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { setPasswordFromLinkAction } from "@/app/auth/actions";
import type { PasswordSetupPurpose } from "@/lib/auth/password-setup-tokens";
import { FormFeedback } from "@/components/ui/form-feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordField } from "./password-field";

export function PasswordSetupForm({ token, purpose }: { token: string; purpose: PasswordSetupPurpose }) {
  const [state, formAction] = useActionState(setPasswordFromLinkAction, {});

  if (state.success) {
    return (
      <div className="auth-link-success">
        <CheckCircle2 size={25} aria-hidden="true" />
        <p>{state.success}</p>
        <Link className="primary-button" href="/login">Войти</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" action={formAction}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="purpose" value={purpose} />
      <PasswordField id="password" label="Новый пароль" autoComplete="new-password" />
      <PasswordField id="passwordConfirmation" label="Повторите пароль" autoComplete="new-password" />
      <FormFeedback error={state.error} />
      <SubmitButton pendingLabel="Сохраняем…">Сохранить пароль</SubmitButton>
    </form>
  );
}
