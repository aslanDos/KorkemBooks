import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SignInPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell eyebrow="С возвращением" title="Войдите в аккаунт" description="Используйте номер телефона и пароль, который вы создали по ссылке-приглашению.">
      <AuthForm />
    </AuthShell>
  );
}

export const metadata: Metadata = { title: "Войти — korkembooks" };
