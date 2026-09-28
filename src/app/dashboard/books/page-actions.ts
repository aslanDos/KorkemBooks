"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshBookPageProgress } from "@/lib/books/queries";
import type { BookPhotoText } from "@/lib/books/types";

const uuid = z.string().uuid();
const bookPageSchema = z.object({ bookId: uuid, pageId: uuid });
const bookImageSchema = z.object({ bookId: uuid, imageId: uuid });

async function getClient() {
  return createSupabaseServerClient();
}

export async function appendBlankPageAction(input: { bookId: string; questionId: string; placement: "before" | "after"; position: number }) {
  const parsed = z.object({ bookId: uuid, questionId: uuid, placement: z.enum(["before", "after"]), position: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return { error: "Некорректная страница" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.rpc("append_book_question_blank", {
    target_book_id: parsed.data.bookId,
    target_question_id: parsed.data.questionId,
    target_placement: parsed.data.placement,
    target_position: parsed.data.position,
  }).single();
  if (error || !data) return { error: "Не удалось добавить пустую страницу" };
  await refreshBookPageProgress(supabase, parsed.data.bookId);
  return { data: data as { id: string; placement: string; position: number; background_style: string } };
}

export async function updatePhotoDisplayModeAction(input: { imageId: string; mode: "contain" | "full" }) {
  const parsed = z.object({ imageId: uuid, mode: z.enum(["contain", "full"]) }).safeParse(input);
  if (!parsed.success) return { error: "Некорректный режим фотографии" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.from("book_page_images").update({ display_mode: parsed.data.mode }).eq("id", parsed.data.imageId).select("id").maybeSingle();
  return error || !data ? { error: "Не удалось сохранить расположение фотографии" } : { success: true };
}

export async function savePhotoTextAction(input: { bookId: string; imageId: string; settings: BookPhotoText }) {
  const parsed = z.object({
    bookId: uuid,
    imageId: uuid,
    settings: z.object({
      enabled: z.boolean(),
      content: z.string().max(300),
      size: z.union([z.literal(10), z.literal(12), z.literal(14), z.literal(16), z.literal(20)]),
      placement: z.enum(["overlay", "below"]),
      position: z.enum(["top", "middle", "bottom"]),
      tone: z.enum(["auto", "light", "dark"]),
      darkening: z.number().min(0).max(50),
      textShadow: z.number().min(0).max(100),
    }),
  }).safeParse(input);
  if (!parsed.success) return { error: "Некорректные настройки текста" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { settings } = parsed.data;
  const { error } = await supabase.from("book_photo_texts").upsert({
    image_id: parsed.data.imageId,
    book_id: parsed.data.bookId,
    enabled: settings.enabled,
    content: settings.content,
    text_size: settings.size,
    placement: settings.placement,
    position: settings.position,
    tone: settings.tone,
    image_darkening: settings.darkening,
    text_shadow: settings.textShadow,
  }, { onConflict: "image_id" });
  return error ? { error: "Не удалось сохранить текст фотографии" } : { success: true };
}

export async function updatePhotoFooterAction(input: { imageId: string; hidden: boolean }) {
  const parsed = z.object({ imageId: uuid, hidden: z.boolean() }).safeParse(input);
  if (!parsed.success) return { error: "Некорректная настройка колонтитула" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.from("book_page_images").update({ hide_footer: parsed.data.hidden }).eq("id", parsed.data.imageId).select("id").maybeSingle();
  return error || !data ? { error: "Не удалось сохранить настройку колонтитула" } : { success: true };
}

export async function reorderBookQuestionPageAction(input: { pageId: string; position: number }) {
  const parsed = z.object({ pageId: uuid, position: z.number().int().positive() }).safeParse(input);
  if (!parsed.success) return { error: "Некорректная позиция страницы" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.rpc("reorder_book_question_page", { target_page_id: parsed.data.pageId, target_position: parsed.data.position });
  return error || !data ? { error: "Не удалось изменить порядок страниц" } : { success: true };
}

export async function deleteBookQuestionBlankAction(input: { bookId: string; pageId: string }) {
  const parsed = bookPageSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректная страница" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.rpc("delete_book_question_blank", { target_page_id: parsed.data.pageId });
  if (error || !data) return { error: "Не удалось удалить пустую страницу" };
  await refreshBookPageProgress(supabase, parsed.data.bookId);
  return { success: true };
}

export async function deleteBookPageImageAction(input: { bookId: string; imageId: string }) {
  const parsed = bookImageSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректная фотография" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: storagePath, error } = await supabase.rpc("delete_book_page_image", { target_image_id: parsed.data.imageId });
  if (error || !storagePath) return { error: "Не удалось удалить фотографию" };
  await supabase.storage.from("book-images").remove([storagePath]);
  await refreshBookPageProgress(supabase, parsed.data.bookId);
  return { success: true };
}

export async function saveBookImageCropAction(input: { imageId: string; x: number; y: number; scale: number }) {
  const parsed = z.object({ imageId: uuid, x: z.number().min(-50).max(50), y: z.number().min(-50).max(50), scale: z.number().min(1).max(3) }).safeParse(input);
  if (!parsed.success) return { error: "Некорректное кадрирование" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.from("book_page_images").update({ crop_x: parsed.data.x, crop_y: parsed.data.y, crop_scale: parsed.data.scale }).eq("id", parsed.data.imageId).select("id").maybeSingle();
  return error || !data ? { error: "Не удалось сохранить кадрирование" } : { success: true };
}

export async function refreshBookProgressAction(bookId: string) {
  const parsed = uuid.safeParse(bookId);
  if (!parsed.success) return { error: "Некорректная книга" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const progress = await refreshBookPageProgress(supabase, parsed.data);
  return progress === null ? { error: "Не удалось обновить прогресс" } : { progress };
}
