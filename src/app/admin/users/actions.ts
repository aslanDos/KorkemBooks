"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isBookTypeReady } from "@/lib/books/catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";
import { issuePasswordSetupToken, type PasswordSetupPurpose } from "@/lib/auth/password-setup-tokens";

const schema = z.object({
  phone: z.string().trim().min(1, "Укажите номер телефона"),
  role: z.enum(["user", "manager"]),
  bookTypeId: z.string().trim().optional(),
  bookLanguage: z.enum(["ru", "kk"]).optional(),
}).superRefine((value, context) => {
  if (value.role === "user" && !z.uuid().safeParse(value.bookTypeId).success) {
    context.addIssue({ code: "custom", path: ["bookTypeId"], message: "Выберите тип получателя" });
  }
  if (value.role === "user" && !value.bookLanguage) {
    context.addIssue({ code: "custom", path: ["bookLanguage"], message: "Выберите язык книги" });
  }
});

type PasswordLink = { url: string; expiresAt: string };

export type CreateUserState = { error?: string; invitation?: PasswordLink & { login: string } };
export type ResetPasswordState = { error?: string; resetLink?: PasswordLink };
export type AssignBookTypeState = { error?: string; success?: string };

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
  if (currentUser?.role !== "admin" && currentUser?.role !== "manager") return { error: "Недостаточно прав" };
  const parsed = schema.safeParse({ phone: formData.get("phone"), role: formData.get("role"), bookTypeId: formData.get("bookTypeId"), bookLanguage: formData.get("bookLanguage") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  if (currentUser.role === "manager" && parsed.data.role !== "user") return { error: "Менеджер может создавать только аккаунты пользователей" };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "Введите корректный номер телефона" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Добавьте SUPABASE_SERVICE_ROLE_KEY для создания аккаунтов" };
  const { data: existing } = await admin.from("profiles").select("id").eq("phone_e164", phone).maybeSingle();
  if (existing) return { error: "Пользователь с таким номером уже существует" };

  let bookTypeId: string | null = null;
  if (parsed.data.role === "user") {
    bookTypeId = parsed.data.bookTypeId ?? null;
    const [{ data: bookType }, { count: questionCount }] = await Promise.all([
      admin.from("book_types").select("id, slug").eq("id", bookTypeId).eq("is_active", true).maybeSingle(),
      admin.from("question_catalog").select("id", { count: "exact", head: true }).eq("book_type_id", bookTypeId),
    ]);
    if (!bookType || !isBookTypeReady({ slug: bookType.slug, questionCount: questionCount ?? 0 })) return { error: "Выбранный тип получателя пока недоступен" };
  }

  const id = crypto.randomUUID();
  const technicalEmail = `${id}@auth.korkembooks.kz`;
  const inaccessiblePassword = `${randomBytes(48).toString("base64url")}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ id, email: technicalEmail, password: inaccessiblePassword, email_confirm: true, user_metadata: { phone_e164: phone } });
  if (error || !data.user) return { error: error?.message ?? "Не удалось создать аккаунт" };
  const { error: profileError } = await admin.from("profiles").update({ role: parsed.data.role, phone_e164: phone, book_type_id: bookTypeId, book_language: parsed.data.role === "user" ? parsed.data.bookLanguage : null }).eq("id", data.user.id);
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

export async function assignUserBookTypeAction(_state: AssignBookTypeState, formData: FormData): Promise<AssignBookTypeState> {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin") return { error: "Недостаточно прав" };

  const parsed = z.object({ userId: z.uuid(), bookTypeId: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Выберите тип получателя" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Добавьте SUPABASE_SERVICE_ROLE_KEY" };
  const [{ data: profile }, { data: bookType }, { count: questionCount }] = await Promise.all([
    admin.from("profiles").select("role, book_type_id").eq("id", parsed.data.userId).maybeSingle(),
    admin.from("book_types").select("id, name, slug").eq("id", parsed.data.bookTypeId).eq("is_active", true).maybeSingle(),
    admin.from("question_catalog").select("id", { count: "exact", head: true }).eq("book_type_id", parsed.data.bookTypeId),
  ]);

  if (!profile || profile.role !== "user") return { error: "Тип можно назначить только пользователю" };
  if (profile.book_type_id) return { error: "Тип получателя уже назначен" };
  if (!bookType || !isBookTypeReady({ slug: bookType.slug, questionCount: questionCount ?? 0 })) return { error: "Выбранный тип пока недоступен" };

  const { data: updated, error } = await admin
    .from("profiles")
    .update({ book_type_id: bookType.id })
    .eq("id", parsed.data.userId)
    .is("book_type_id", null)
    .select("id")
    .maybeSingle();
  if (error || !updated) return { error: "Не удалось назначить тип получателя" };

  revalidatePath("/admin/users");
  return { success: bookType.name };
}
