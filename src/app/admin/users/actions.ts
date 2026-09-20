"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";
import { issuePasswordSetupToken, type PasswordSetupPurpose } from "@/lib/auth/password-setup-tokens";

const schema = z.object({
  displayName: z.string().trim().min(2, "Укажите имя").max(120),
  phone: z.string().trim().min(1, "Укажите номер телефона"),
  role: z.enum(["user", "manager"]),
});

type PasswordLink = { url: string; expiresAt: string };

export type CreateUserState = { error?: string; invitation?: PasswordLink & { login: string } };
export type ResetPasswordState = { error?: string; resetLink?: PasswordLink };

async function getPublicUrl(path: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    try {
      return new URL(path, configuredUrl).toString();
    } catch {
      // Fall back to request headers if the configured URL is malformed.
    }
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ?? requestHeaders.get("host");
  if (!host) return path;
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${protocol}://${host}${path}`;
}

async function createPasswordLink(userId: string, purpose: PasswordSetupPurpose) {
  const { token, expiresAt } = await issuePasswordSetupToken(userId, purpose);
  return {
    url: await getPublicUrl(`/auth/${purpose}/${token}`),
    expiresAt,
  };
}

export async function createUserAction(_state: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = schema.safeParse({ displayName: formData.get("displayName"), phone: formData.get("phone"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "Введите корректный номер телефона" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Добавьте SUPABASE_SERVICE_ROLE_KEY для создания аккаунтов" };
  const { data: existing } = await admin.from("profiles").select("id").eq("phone_e164", phone).maybeSingle();
  if (existing) return { error: "Пользователь с таким номером уже существует" };
  const id = crypto.randomUUID();
  const technicalEmail = `${id}@auth.korkembooks.kz`;
  const inaccessiblePassword = `${randomBytes(48).toString("base64url")}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ id, email: technicalEmail, password: inaccessiblePassword, email_confirm: true, user_metadata: { display_name: parsed.data.displayName, phone_e164: phone } });
  if (error || !data.user) return { error: error?.message ?? "Не удалось создать аккаунт" };
  const { error: profileError } = await admin.from("profiles").update({ role: parsed.data.role, display_name: parsed.data.displayName, phone_e164: phone }).eq("id", data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Не удалось сохранить профиль пользователя" };
  }

  let invitation: PasswordLink;
  try {
    invitation = await createPasswordLink(data.user.id, "invite");
  } catch {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Не удалось создать ссылку-приглашение. Проверьте миграции базы данных." };
  }

  revalidatePath("/admin/users");
  return { invitation: { login: phone, ...invitation } };
}

export async function resetUserPasswordAction(_state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") return { error: "Недостаточно прав" };

  const parsed = z.object({ userId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Некорректные данные пользователя" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Добавьте SUPABASE_SERVICE_ROLE_KEY для сброса пароля" };

  const { data: profile } = await admin.from("profiles").select("phone_e164").eq("id", parsed.data.userId).maybeSingle();
  if (!profile?.phone_e164) return { error: "У пользователя не указан номер телефона" };

  try {
    const resetLink = await createPasswordLink(parsed.data.userId, "reset");
    return { resetLink };
  } catch {
    return { error: "Не удалось создать ссылку для сброса. Проверьте миграции базы данных." };
  }
}
