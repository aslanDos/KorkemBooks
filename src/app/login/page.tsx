import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell eyebrow="С возвращением" title="Войдите в аккаунт" description="Используйте номер телефона и пароль, полученные от администратора.">
      <AuthForm />
    </AuthShell>
  );
}

export const metadata: Metadata = { title: "Войти — korkembooks" };
