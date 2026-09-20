import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PasswordSetupPurpose = "invite" | "reset";

type PasswordSetupToken = {
  id: string;
  userId: string;
  purpose: PasswordSetupPurpose;
  expiresAt: string;
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOKEN_LIFETIME_MS: Record<PasswordSetupPurpose, number> = {
  invite: 7 * 24 * 60 * 60 * 1000,
  reset: 24 * 60 * 60 * 1000,
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordSetupToken(userId: string, purpose: PasswordSetupPurpose) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const token = randomBytes(32).toString("base64url");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + TOKEN_LIFETIME_MS[purpose]);

  // A newly generated link replaces every previous unused link for this user.
  const { error: revokeError } = await admin
    .from("password_setup_tokens")
    .update({ used_at: issuedAt.toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);
  if (revokeError) throw revokeError;

  const { error } = await admin.from("password_setup_tokens").insert({
    user_id: userId,
    token_hash: hashToken(token),
    purpose,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function getValidPasswordSetupToken(
  token: string,
  purpose: PasswordSetupPurpose,
): Promise<PasswordSetupToken | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("password_setup_tokens")
    .select("id, user_id, purpose, expires_at")
    .eq("token_hash", hashToken(token))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    purpose: data.purpose as PasswordSetupPurpose,
    expiresAt: data.expires_at,
  };
}

export async function consumePasswordSetupToken(token: string, purpose: PasswordSetupPurpose, password: string) {
  const passwordToken = await getValidPasswordSetupToken(token, purpose);
  if (!passwordToken) return { error: "Ссылка истекла, уже использована или недействительна" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Авторизация ещё не настроена" };

  const usedAt = new Date().toISOString();
  const { data: claimedToken, error: claimError } = await admin
    .from("password_setup_tokens")
    .update({ used_at: usedAt })
    .eq("id", passwordToken.id)
    .is("used_at", null)
    .gt("expires_at", usedAt)
    .select("id")
    .maybeSingle();

  if (claimError || !claimedToken) {
    return { error: "Ссылка истекла, уже использована или недействительна" };
  }

  const { error: passwordError } = await admin.auth.admin.updateUserById(passwordToken.userId, { password });
  if (passwordError) {
    // Let the user retry if Supabase Auth failed after the token was claimed.
    await admin.from("password_setup_tokens").update({ used_at: null }).eq("id", passwordToken.id).eq("used_at", usedAt);
    return { error: "Не удалось сохранить пароль. Попробуйте ещё раз" };
  }

  return { success: true as const };
}
