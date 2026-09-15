"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateChapterSchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1, "Введите название главы").max(200, "Название слишком длинное"),
});

export type ChapterActionState = { error?: string; success?: boolean };

export async function updateChapterAction(_: ChapterActionState, formData: FormData): Promise<ChapterActionState> {
  const parsed = updateChapterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте название" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: updated, error } = await supabase
    .from("chapters")
    .update({ title: parsed.data.title })
    .eq("id", parsed.data.chapterId)
    .select("id")
    .maybeSingle();

  if (error || !updated) return { error: "Не удалось изменить главу" };
  revalidatePath(`/dashboard/books/${parsed.data.bookId}`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/write`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  return { success: true };
}
