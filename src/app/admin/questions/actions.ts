"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const editSchema = z.object({
  catalogId: z.uuid(),
  language: z.enum(["ru", "kk"]),
  expectedPrompt: z.string().min(1).max(1000),
  prompt: z.string().trim().min(1, "Введите вопрос").max(1000, "Вопрос слишком длинный"),
});

const editChapterSchema = z.object({
  catalogId: z.uuid(),
  language: z.enum(["ru", "kk"]),
  expectedTitle: z.string().min(1).max(160),
  title: z.string().trim().min(1, "Введите название главы").max(160, "Название главы слишком длинное"),
});

export async function editCatalogChapterAction(input: { catalogId: string; language: "ru" | "kk"; expectedTitle: string; title: string }): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = editChapterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте название" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: updated, error } = await admin.rpc("admin_edit_chapter_catalog", {
    target_catalog_id: parsed.data.catalogId,
    target_language: parsed.data.language,
    expected_title: parsed.data.expectedTitle,
    new_title: parsed.data.title,
  });
  if (error) return { error: "Не удалось сохранить главу. Проверьте, что применена последняя миграция базы данных." };
  if (updated !== true) return { error: "Название уже изменилось. Обновите страницу и попробуйте снова." };
  revalidatePath("/admin/questions");
  revalidatePath("/admin/books", "layout");
  revalidatePath("/dashboard/books", "layout");
  return { success: true };
}

export async function editCatalogQuestionAction(input: {
  catalogId: string;
  language: "ru" | "kk";
  expectedPrompt: string;
  prompt: string;
}): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте формулировку" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: updated, error } = await admin.rpc("admin_edit_question_catalog", {
    target_catalog_id: parsed.data.catalogId,
    target_language: parsed.data.language,
    expected_prompt: parsed.data.expectedPrompt,
    new_prompt: parsed.data.prompt,
  });
  if (error) return { error: "Не удалось сохранить вопрос. Проверьте, что применена новая миграция базы данных." };
  if (updated !== true) return { error: "Вопрос уже изменён. Обновите страницу и попробуйте снова." };

  revalidatePath("/admin/questions");
  revalidatePath("/admin/books", "layout");
  revalidatePath("/dashboard/books", "layout");
  return { success: true };
}
