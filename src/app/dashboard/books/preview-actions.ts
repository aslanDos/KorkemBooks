"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookAnswerTextSize, BookChapterTitleSize, BookQuestionTextSize, BookTitlePageTitleSize } from "@/lib/books/types";

const chapterPageStyleSchema = z.object({
  bookId: z.string().uuid(),
  style: z.enum(["default", "numeral", "vertical"]),
});

const titlePageTitleSizeSchema = z.object({
  bookId: z.string().uuid(),
  size: z.union([z.literal(16), z.literal(18), z.literal(20), z.literal(22), z.literal(24)]),
});

const chapterTitleSizeSchema = z.object({
  bookId: z.string().uuid(),
  size: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(14)]),
});

const pageBackgroundSchema = z.object({
  bookId: z.string().uuid(),
  background: z.enum(["white", "primary", "wine", "berry", "terracotta", "navy", "umber", "olive", "ochre"]),
});

const pageTextSizeSchema = z.discriminatedUnion("target", [
  z.object({ bookId: z.string().uuid(), target: z.literal("question"), size: z.union([z.literal(8), z.literal(10), z.literal(12), z.literal(14), z.literal(16)]) }),
  z.object({ bookId: z.string().uuid(), target: z.literal("answer"), size: z.union([z.literal(14), z.literal(16), z.literal(18), z.literal(20), z.literal(22)]) }),
]);

const footerVisibilitySchema = z.object({
  bookId: z.string().uuid(),
  target: z.enum(["author", "title"]),
  visible: z.boolean(),
});

export async function saveBookTitlePageTitleSizeAction(input: { bookId: string; size: BookTitlePageTitleSize }) {
  const parsed = titlePageTitleSizeSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный размер названия книги" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: updated, error } = await supabase
    .from("books")
    .update({ title_page_title_size: parsed.data.size })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes("title_page_title_size");
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить размер названия книги" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/write`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}

export async function saveChapterPageStyleAction(input: { bookId: string; style: "default" | "numeral" | "vertical" }) {
  const parsed = chapterPageStyleSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный вариант оформления" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: updated, error } = await supabase
    .from("books")
    .update({ chapter_page_style: parsed.data.style })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes("chapter_page_style");
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить оформление главы" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}

export async function saveChapterTitleSizeAction(input: { bookId: string; size: BookChapterTitleSize }) {
  const parsed = chapterTitleSizeSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный размер заголовка главы" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: updated, error } = await supabase
    .from("books")
    .update({ chapter_title_size: parsed.data.size })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes("chapter_title_size");
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить размер заголовка главы" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}

export async function saveBookPageTextSizeAction(input: { bookId: string; target: "question"; size: BookQuestionTextSize } | { bookId: string; target: "answer"; size: BookAnswerTextSize }) {
  const parsed = pageTextSizeSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный размер текста" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const column = parsed.data.target === "question" ? "question_text_size" : "answer_text_size";
  const { data: updated, error } = await supabase
    .from("books")
    .update({ [column]: parsed.data.size })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes(column);
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить размер текста" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/write`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}

export async function saveBookFooterVisibilityAction(input: { bookId: string; target: "author" | "title"; visible: boolean }) {
  const parsed = footerVisibilitySchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректная настройка колонтитула" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const column = parsed.data.target === "author" ? "show_footer_author" : "show_footer_title";
  const { data: updated, error } = await supabase
    .from("books")
    .update({ [column]: parsed.data.visible })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes(column);
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить настройку колонтитула" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/write`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}

export async function saveBookPageBackgroundAction(input: { bookId: string; background: "white" | "primary" | "wine" | "berry" | "terracotta" | "navy" | "umber" | "olive" | "ochre" }) {
  const parsed = pageBackgroundSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный фон страниц" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: updated, error } = await supabase
    .from("books")
    .update({ page_background_style: parsed.data.background })
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    const schemaIsOutdated = error?.code === "PGRST204" || error?.message.includes("page_background_style");
    return { error: schemaIsOutdated ? "База данных не обновлена. Примените последнюю миграцию." : "Не удалось сохранить основной фон страниц" };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/write`);
  revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  return { success: true };
}
