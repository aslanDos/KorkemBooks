"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshBookPageProgress } from "@/lib/books/queries";
import type { BookCollageImage, BookPhotoText, BookTextPage } from "@/lib/books/types";

const uuid = z.string().uuid();
const bookPageSchema = z.object({ bookId: uuid, pageId: uuid });
const bookImageSchema = z.object({ bookId: uuid, imageId: uuid });
const storedCollageImageSchema = z.object({
  id: uuid,
  slot: z.number().int().min(2).max(4),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().nonnegative(),
  cropX: z.number().min(-50).max(50),
  cropY: z.number().min(-50).max(50),
  cropScale: z.number().min(1).max(3),
});

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

export async function appendTextPageAction(input: { bookId: string; questionId: string; placement: "before" | "after"; position: number; style: BookTextPage["style"] }) {
  const parsed = z.object({ bookId: uuid, questionId: uuid, placement: z.enum(["before", "after"]), position: z.number().int().positive(), style: z.enum(["text", "quote"]) }).safeParse(input);
  if (!parsed.success) return { error: "Некорректная текстовая страница" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.rpc("append_book_question_text", {
    target_book_id: parsed.data.bookId,
    target_question_id: parsed.data.questionId,
    target_placement: parsed.data.placement,
    target_position: parsed.data.position,
    target_text_style: parsed.data.style,
  }).single();
  if (error || !data) return { error: "Не удалось добавить текстовую страницу" };
  await refreshBookPageProgress(supabase, parsed.data.bookId);
  return { data: data as { id: string; placement: string; position: number; background_style: string; text_content: string; text_attribution: string; text_style: string; text_size: number; hide_footer: boolean } };
}

export async function saveBookTextPageAction(input: { pageId: string; content: string; attribution: string; style: BookTextPage["style"]; fontSize: BookTextPage["fontSize"]; hideFooter: boolean }) {
  const parsed = z.object({
    pageId: uuid,
    content: z.string().max(1200),
    attribution: z.string().max(160),
    style: z.enum(["text", "quote"]),
    fontSize: z.union([z.literal(14), z.literal(16), z.literal(18), z.literal(20), z.literal(22), z.literal(24), z.literal(28), z.literal(32)]),
    hideFooter: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) return { error: "Текст страницы слишком длинный" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.from("book_question_pages").update({
    text_content: parsed.data.content,
    text_attribution: parsed.data.attribution,
    text_style: parsed.data.style,
    text_size: parsed.data.fontSize,
    hide_footer: parsed.data.hideFooter,
  }).eq("id", parsed.data.pageId).eq("kind", "text").select("id").maybeSingle();
  return error || !data ? { error: "Не удалось сохранить текстовую страницу" } : { success: true };
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
    placement: "overlay",
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

export async function deleteBookQuestionTextAction(input: { bookId: string; pageId: string }) {
  const parsed = bookPageSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректная текстовая страница" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data, error } = await supabase.rpc("delete_book_question_text", { target_page_id: parsed.data.pageId });
  if (error || !data) return { error: "Не удалось удалить текстовую страницу" };
  await refreshBookPageProgress(supabase, parsed.data.bookId);
  return { success: true };
}

export async function deleteBookPageImageAction(input: { bookId: string; imageId: string }) {
  const parsed = bookImageSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректная фотография" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: image } = await supabase.from("book_page_images").select("collage_images").eq("id", parsed.data.imageId).maybeSingle();
  const { data: storagePath, error } = await supabase.rpc("delete_book_page_image", { target_image_id: parsed.data.imageId });
  if (error || !storagePath) return { error: "Не удалось удалить фотографию" };
  const collagePaths = Array.isArray(image?.collage_images)
    ? image.collage_images.flatMap((item) => item && typeof item === "object" && "storagePath" in item && typeof item.storagePath === "string" ? [item.storagePath] : [])
    : [];
  await supabase.storage.from("book-images").remove([storagePath, ...collagePaths]);
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

export async function saveBookCollageImageCropAction(input: { pageImageId: string; imageId: string; x: number; y: number; scale: number }) {
  const parsed = z.object({ pageImageId: uuid, imageId: uuid, x: z.number().min(-50).max(50), y: z.number().min(-50).max(50), scale: z.number().min(1).max(3) }).safeParse(input);
  if (!parsed.success) return { error: "Некорректное кадрирование" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: row, error: readError } = await supabase.from("book_page_images").select("collage_images").eq("id", parsed.data.pageImageId).maybeSingle();
  if (readError || !row || !Array.isArray(row.collage_images)) return { error: "Фотография коллажа не найдена" };
  let found = false;
  const collageImages = row.collage_images.map((item) => {
    if (!item || typeof item !== "object" || !("id" in item) || item.id !== parsed.data.imageId) return item;
    found = true;
    return { ...item, cropX: parsed.data.x, cropY: parsed.data.y, cropScale: parsed.data.scale };
  });
  if (!found) return { error: "Фотография коллажа не найдена" };
  const { data, error } = await supabase.from("book_page_images").update({ collage_images: collageImages }).eq("id", parsed.data.pageImageId).select("id").maybeSingle();
  return error || !data ? { error: "Не удалось сохранить кадрирование" } : { success: true };
}

export async function reorderBookCollageImagesAction(input: { pageImageId: string; fromSlot: number; toSlot: number }) {
  const parsed = z.object({ pageImageId: uuid, fromSlot: z.number().int().min(1).max(4), toSlot: z.number().int().min(1).max(4) }).safeParse(input);
  if (!parsed.success || parsed.data.fromSlot === parsed.data.toSlot) return { error: "Некорректный порядок фотографий" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: row, error: readError } = await supabase.from("book_page_images")
    .select("storage_path, mime_type, size_bytes, crop_x, crop_y, crop_scale, collage_layout, collage_images")
    .eq("id", parsed.data.pageImageId)
    .maybeSingle();
  if (readError || !row) return { error: "Коллаж не найден" };

  const children = z.array(storedCollageImageSchema).safeParse(row.collage_images);
  if (!children.success) return { error: "Не удалось прочитать фотографии коллажа" };
  const expectedCount = row.collage_layout === "four_grid" ? 4 : row.collage_layout === "two_columns" || row.collage_layout === "two_rows" ? 2 : 1;
  const ordered = [{
    id: null as string | null,
    slot: 1,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    cropX: Number(row.crop_x ?? 0),
    cropY: Number(row.crop_y ?? 0),
    cropScale: Number(row.crop_scale ?? 1),
  }, ...children.data].sort((a, b) => a.slot - b.slot);
  if (ordered.length !== expectedCount || parsed.data.fromSlot > expectedCount || parsed.data.toSlot > expectedCount) return { error: "Фотография коллажа не найдена" };

  const [moved] = ordered.splice(parsed.data.fromSlot - 1, 1);
  ordered.splice(parsed.data.toSlot - 1, 0, moved);
  const primary = ordered[0];
  const collageImages: BookCollageImage[] = ordered.slice(1).map((image, index) => ({
    id: image.id ?? crypto.randomUUID(),
    slot: index + 2,
    storagePath: image.storagePath,
    signedUrl: "",
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    cropX: image.cropX,
    cropY: image.cropY,
    cropScale: image.cropScale,
  }));
  const storedImages = collageImages.map((image) => ({
    id: image.id,
    slot: image.slot,
    storagePath: image.storagePath,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    cropX: image.cropX,
    cropY: image.cropY,
    cropScale: image.cropScale,
  }));
  const { data, error } = await supabase.from("book_page_images").update({
    storage_path: primary.storagePath,
    mime_type: primary.mimeType,
    size_bytes: primary.sizeBytes,
    crop_x: primary.cropX,
    crop_y: primary.cropY,
    crop_scale: primary.cropScale,
    collage_images: storedImages,
  }).eq("id", parsed.data.pageImageId).select("id").maybeSingle();
  if (error || !data) return { error: "Не удалось изменить порядок фотографий" };
  return { data: {
    storagePath: primary.storagePath,
    mimeType: primary.mimeType,
    sizeBytes: primary.sizeBytes,
    cropX: primary.cropX,
    cropY: primary.cropY,
    cropScale: primary.cropScale,
    collageImages,
  } };
}

export async function refreshBookProgressAction(bookId: string) {
  const parsed = uuid.safeParse(bookId);
  if (!parsed.success) return { error: "Некорректная книга" };
  const supabase = await getClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const progress = await refreshBookPageProgress(supabase, parsed.data);
  return progress === null ? { error: "Не удалось обновить прогресс" } : { progress };
}
