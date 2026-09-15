"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/auth/phone";

const schema = z.object({
  displayName: z.string().trim().min(2, "Укажите имя").max(120),
  phone: z.string().trim().min(1, "Укажите номер телефона"),
  role: z.enum(["user", "manager"]),
});

export type CreateUserState = { error?: string; credentials?: { login: string; password: string } };
export type ResetPasswordState = { error?: string; credentials?: { login: string; password: string } };

function generatePassword() {
  const consonants = "bcdfghjkmnprstvwz";
  const vowels = "aeiou";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const letter = (alphabet: string, byte: number) => alphabet[byte % alphabet.length];
  const word = [
    letter(consonants, bytes[0]),
    letter(vowels, bytes[1]),
    letter(consonants, bytes[2]),
    letter(consonants, bytes[3]),
    letter(vowels, bytes[4]),
    letter(consonants, bytes[5]),
  ].join("");
  const digits = `${bytes[6] % 10}${bytes[7] % 10}${crypto.getRandomValues(new Uint8Array(1))[0] % 10}${crypto.getRandomValues(new Uint8Array(1))[0] % 10}`;

  return `${word[0].toUpperCase()}${word.slice(1)}${digits}`;
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
  const password = generatePassword();
  const id = crypto.randomUUID();
  const technicalEmail = `${id}@auth.korkembooks.kz`;
  const { data, error } = await admin.auth.admin.createUser({ id, email: technicalEmail, password, email_confirm: true, user_metadata: { display_name: parsed.data.displayName, phone_e164: phone } });
  if (error || !data.user) return { error: error?.message ?? "Не удалось создать аккаунт" };
  const { error: profileError } = await admin.from("profiles").update({ role: parsed.data.role, display_name: parsed.data.displayName, phone_e164: phone }).eq("id", data.user.id);
  if (profileError) return { error: "Аккаунт создан, но роль не обновлена. Проверьте профиль вручную." };
  revalidatePath("/admin/users");
  return { credentials: { login: phone, password } };
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

  const password = generatePassword();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, { password });
  if (error) return { error: "Не удалось сбросить пароль" };

  return { credentials: { login: profile.phone_e164, password } };
}
