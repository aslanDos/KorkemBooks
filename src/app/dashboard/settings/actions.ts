"use server";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDevUser } from "@/lib/auth/dev-auth";
import { getAuthErrorMessage } from "@/lib/auth/messages";
import { changePasswordSchema } from "@/lib/auth/validation";
import type { AuthActionState } from "@/app/auth/actions";

export async function changePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные" };
  if (await getDevUser()) return { error: "Пароль тестового аккаунта нельзя изменить здесь" };

  const supabase = await createSupabaseServerClient();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabase || !url || !publishableKey) return { error: "Сервис авторизации временно недоступен" };

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) return { error: "Войдите в аккаунт ещё раз" };

  // Verify without touching the browser's active session or its cookies.
  const verifier = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError?.code === "invalid_credentials") return { error: "Неверный текущий пароль" };
  if (verifyError) return { error: "Не удалось проверить текущий пароль. Попробуйте позже" };
  if (verified.user?.id !== user.id) return { error: "Не удалось подтвердить аккаунт. Войдите снова" };

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) return { error: getAuthErrorMessage(updateError.message) };
  return { success: "Пароль успешно изменён" };
}
