"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const suggestionSchema = z.object({
  bookId: z.uuid(),
  questionId: z.uuid(),
  suggestedPrompt: z.string().trim().min(1, "Введите исправленный вопрос").max(1000, "Вопрос слишком длинный"),
});

export async function submitQuestionSuggestionAction(input: { bookId: string; questionId: string; suggestedPrompt: string }): Promise<{ error?: string; success?: boolean }> {
  const parsed = suggestionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте формулировку" };

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { error: "Сервис временно недоступен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Войдите в аккаунт ещё раз" };

  const { data: book } = await supabase.from("books")
    .select("id, language")
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!book) return { error: "Книга не найдена" };

  const { data: question } = await supabase.from("questions")
    .select("id, prompt, catalog_id")
    .eq("id", parsed.data.questionId)
    .eq("book_id", book.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!question?.catalog_id) return { error: "Этот вопрос недоступен для исправления" };
  if (question.prompt.trim() === parsed.data.suggestedPrompt) return { error: "Новая формулировка совпадает с текущей" };

  const { count, error: countError } = await admin.from("question_prompt_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("status", "pending");
  if (countError) return { error: "Не удалось проверить предложения" };
  if ((count ?? 0) >= 10) return { error: "У вас уже есть 10 предложений на рассмотрении" };

  const { error } = await admin.from("question_prompt_suggestions").insert({
    book_id: book.id,
    question_id: question.id,
    owner_id: user.id,
    language: book.language,
    original_prompt: question.prompt,
    suggested_prompt: parsed.data.suggestedPrompt,
  });
  if (error?.code === "23505") return { error: "Исправление этого вопроса уже ожидает рассмотрения" };
  if (error) return { error: "Не удалось отправить предложение" };

  revalidatePath("/dashboard/suggestions");
  return { success: true };
}
