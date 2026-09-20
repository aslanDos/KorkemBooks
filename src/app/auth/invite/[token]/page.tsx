import type { Metadata } from "next";
import { PasswordSetupPage } from "@/components/auth/password-setup-page";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PasswordSetupPage token={token} purpose="invite" />;
}

export const metadata: Metadata = { title: "Создать пароль — korkembooks" };
