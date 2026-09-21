"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  suggestionId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  finalPrompt: z.string().trim().max(1000, "Вопрос слишком длинный"),
}).superRefine((value, context) => {
  if (value.decision === "approved" && !value.finalPrompt) {
    context.addIssue({ code: "custom", path: ["finalPrompt"], message: "Введите итоговую формулировку" });
  }
});

export async function reviewQuestionSuggestionAction(input: { suggestionId: string; decision: "approved" | "rejected"; finalPrompt: string }): Promise<{ error?: string; success?: boolean }> {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "admin" && currentUser?.role !== "manager") return { error: "Недостаточно прав" };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: suggestion } = await admin.from("question_prompt_suggestions")
    .select("book_id")
    .eq("id", parsed.data.suggestionId)
    .eq("status", "pending")
    .maybeSingle();
  if (!suggestion) return { error: "Предложение уже рассмотрено или удалено" };

  const { data: resolved, error } = await admin.rpc("resolve_question_prompt_suggestion", {
    target_suggestion_id: parsed.data.suggestionId,
    target_status: parsed.data.decision,
    final_prompt: parsed.data.decision === "approved" ? parsed.data.finalPrompt : null,
  });
  if (error) return { error: `Не удалось обработать предложение: ${error.message}` };
  if (resolved !== true) return { error: "Формулировка книги изменилась. Обновите страницу и проверьте предложение" };

  revalidatePath("/dashboard/suggestions");
  revalidatePath(`/dashboard/books/${suggestion.book_id}`, "layout");
  revalidatePath(`/admin/books/${suggestion.book_id}`, "layout");
  return { success: true };
}
