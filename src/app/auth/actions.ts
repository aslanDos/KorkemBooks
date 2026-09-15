"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthErrorMessage } from "@/lib/auth/messages";
import { newPasswordSchema, signInSchema } from "@/lib/auth/validation";
import { createDevSession, deleteDevSession, isValidDevCredentials } from "@/lib/auth/dev-auth";

export type AuthActionState = { error?: string; success?: string };

function configurationError(): AuthActionState {
  return { error: "Авторизация ещё не настроена. Добавьте переменные Supabase в .env.local" };
}

function validationError(issues: { message: string }[]): AuthActionState {
  return { error: issues[0]?.message ?? "Проверьте введённые данные" };
}

export async function signInAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error.issues);

  if (isValidDevCredentials(parsed.data.login, parsed.data.password)) {
    await createDevSession();
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return configurationError();

  let email = parsed.data.login;
  if (!email.includes("@")) {
    const admin = createSupabaseAdminClient();
    if (!admin) return configurationError();
    const { data: profile } = await admin.from("profiles").select("id").eq("phone_e164", email).maybeSingle();
    if (!profile) return { error: "Неверный номер телефона или пароль" };
    const { data } = await admin.auth.admin.getUserById(profile.id);
    if (!data.user?.email) return { error: "Неверный номер телефона или пароль" };
    email = data.user.email;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) return { error: "Неверный номер телефона или пароль" };
  redirect("/dashboard");
}

export async function updatePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error.issues);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return configurationError();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: getAuthErrorMessage(error.message) };
  return { success: "Пароль успешно изменён" };
}

export async function signOutAction() {
  await deleteDevSession();
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
