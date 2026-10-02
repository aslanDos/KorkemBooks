"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const questionPromptSchema = z.object({
  bookId: z.uuid(),
  questionId: z.uuid(),
  prompt: z.string().trim().min(1, "Введите текст вопроса").max(1000, "Вопрос слишком длинный"),
});

export async function updateQuestionPromptAction(input: { bookId: string; questionId: string; prompt: string }): Promise<{ error?: string; success?: boolean }> {
  const parsed = questionPromptSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте текст вопроса" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Сервис временно недоступен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Войдите в аккаунт ещё раз" };

  const { data: updated, error } = await supabase.rpc("update_own_book_question_prompt", {
    target_book_id: parsed.data.bookId,
    target_question_id: parsed.data.questionId,
    new_prompt: parsed.data.prompt,
  });
  if (error || updated !== true) return { error: "Не удалось изменить вопрос" };

  revalidatePath(`/dashboard/books/${parsed.data.bookId}`, "layout");
  revalidatePath(`/admin/books/${parsed.data.bookId}`, "layout");
  return { success: true };
}
