import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Восстановление доступа" title="Обратитесь к администратору" description="Администратор сбросит пароль и передаст вам новый временный пароль." footer={<Link href="/login">Вернуться ко входу</Link>}>{null}</AuthShell>
  );
}
