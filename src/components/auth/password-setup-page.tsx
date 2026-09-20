import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordSetupForm } from "@/components/auth/password-setup-form";
import { getValidPasswordSetupToken, type PasswordSetupPurpose } from "@/lib/auth/password-setup-tokens";

const copy: Record<PasswordSetupPurpose, { eyebrow: string; title: string; description: string }> = {
  invite: {
    eyebrow: "Приглашение",
    title: "Создайте пароль",
    description: "Придумайте пароль для входа в свой аккаунт. Используйте не менее восьми символов.",
  },
  reset: {
    eyebrow: "Восстановление доступа",
    title: "Создайте новый пароль",
    description: "Придумайте новый пароль для входа. Используйте не менее восьми символов.",
  },
};

export async function PasswordSetupPage({ token, purpose }: { token: string; purpose: PasswordSetupPurpose }) {
  const passwordToken = await getValidPasswordSetupToken(token, purpose);

  if (!passwordToken) {
    return (
      <AuthShell
        eyebrow="Ссылка недействительна"
        title="Не удалось открыть ссылку"
        description="Срок действия ссылки истёк, она уже была использована или адрес скопирован не полностью. Попросите администратора создать новую ссылку."
        footer={<Link href="/login">Вернуться ко входу</Link>}
      >
        {null}
      </AuthShell>
    );
  }

  const content = copy[purpose];
  return (
    <AuthShell eyebrow={content.eyebrow} title={content.title} description={content.description}>
      <PasswordSetupForm token={token} purpose={purpose} />
    </AuthShell>
  );
}
