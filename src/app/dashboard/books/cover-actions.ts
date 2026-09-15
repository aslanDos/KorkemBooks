"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const selectCoverSchema = z.object({
  bookId: z.string().uuid(),
  templateId: z.string().uuid(),
  showAuthor: z.boolean(),
  showRecipient: z.boolean(),
  title: z.string().trim().min(1, "Введите название книги").max(200, "Название слишком длинное"),
  authorName: z.string().trim().min(1, "Введите имя автора").max(120, "Имя автора слишком длинное"),
  recipientName: z.string().trim().max(120, "Имя получателя слишком длинное").default(""),
  customBackgroundPath: z.string().max(1000).nullable(),
  titlePosition: z.enum(["top", "center", "bottom"]),
  fontStyle: z.enum(["playfair", "forum", "manrope"]),
  textTone: z.enum(["dark", "light"]),
  overlayStrength: z.number().min(0).max(0.6),
  colorKey: z.enum(["wine", "berry", "terracotta", "navy", "umber", "olive", "ochre"]),
  coverStyle: z.enum(["solid", "template"]),
  coloredBack: z.boolean(),
  backgroundInsideFrame: z.boolean().default(false),
  showFrame: z.boolean(),
  frameStyle: z.enum(["ver1", "ver2"]),
  frameColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  showBackText: z.boolean(),
  spineLetterSpacing: z.number().int().min(0).max(50),
  spineAuthorName: z.string().trim().max(120, "Имя автора на корешке слишком длинное").default(""),
  titleSize: z.union([z.literal(16), z.literal(20), z.literal(24), z.literal(28), z.literal(32)]).default(24),
  authorSize: z.union([z.literal(8), z.literal(10), z.literal(12), z.literal(14), z.literal(16)]).default(10),
  backTextTone: z.enum(["dark", "light"]),
  adminMode: z.boolean().default(false),
});

export async function selectBookCoverAction(input: { bookId: string; templateId: string; showAuthor: boolean; showRecipient: boolean; title: string; authorName: string; recipientName: string; customBackgroundPath: string | null; titlePosition: "top" | "center" | "bottom"; fontStyle: "playfair" | "forum" | "manrope"; textTone: "dark" | "light"; overlayStrength: number; colorKey: "wine" | "berry" | "terracotta" | "navy" | "umber" | "olive" | "ochre"; coverStyle: "solid" | "template"; coloredBack: boolean; backgroundInsideFrame?: boolean; showFrame: boolean; frameStyle: "ver1" | "ver2"; frameColor?: string | null; showBackText: boolean; spineLetterSpacing: number; spineAuthorName?: string; titleSize?: number; authorSize?: number; backTextTone: "dark" | "light"; adminMode?: boolean }) {
  const parsed = selectCoverSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный шаблон обложки" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (parsed.data.adminMode && profile?.role !== "admin") return { error: "Недостаточно прав" };
  const database = parsed.data.adminMode ? createSupabaseAdminClient() : supabase;
  if (!database) return { error: "Supabase не настроен" };

  let bookQuery = database.from("books").select("id, owner_id, production_status").eq("id", parsed.data.bookId).is("deleted_at", null);
  if (!parsed.data.adminMode) bookQuery = bookQuery.eq("owner_id", user.id);
  const [{ data: book }, { data: template }] = await Promise.all([
    bookQuery.maybeSingle(),
    database.from("cover_templates").select("id").eq("id", parsed.data.templateId).eq("is_active", true).maybeSingle(),
  ]);
  if (!book || !template) return { error: "Книга или шаблон не найдены" };
  if (!parsed.data.adminMode && book.production_status !== "writing") return { error: "Книга уже отправлена на редактуру и доступна только для просмотра" };

  const { data: previousCover } = await database.from("book_covers").select("custom_background_path").eq("book_id", parsed.data.bookId).maybeSingle();
  if (parsed.data.customBackgroundPath && parsed.data.customBackgroundPath !== previousCover?.custom_background_path) {
    const prefix = `${user.id}/${book.id}/`;
    if (!parsed.data.customBackgroundPath.startsWith(prefix) || !/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(parsed.data.customBackgroundPath.slice(prefix.length))) return { error: "Некорректный фон обложки" };
    const { error: imageError } = await database.storage.from("book-cover-images").createSignedUrl(parsed.data.customBackgroundPath, 60);
    if (imageError) return { error: "Загруженный фон не найден или недоступен" };
  }
  const { error: bookError } = await database.from("books").update({
    title: parsed.data.title,
    author_name: parsed.data.authorName,
    recipient_name: parsed.data.recipientName,
  }).eq("id", parsed.data.bookId);
  if (bookError) return { error: "Не удалось сохранить данные книги" };

  const { error } = await database.from("book_covers").upsert({
    book_id: parsed.data.bookId,
    template_id: parsed.data.templateId,
    owner_id: book.owner_id,
    show_author: parsed.data.showAuthor,
    show_recipient: parsed.data.showRecipient,
    custom_background_path: parsed.data.customBackgroundPath,
    title_position: parsed.data.titlePosition,
    font_style: parsed.data.fontStyle,
    text_tone: parsed.data.textTone,
    overlay_strength: parsed.data.overlayStrength,
    color_key: parsed.data.colorKey,
    cover_style: parsed.data.coverStyle,
    colored_back: parsed.data.coloredBack,
    background_inside_frame: parsed.data.backgroundInsideFrame,
    show_frame: parsed.data.showFrame,
    frame_style: parsed.data.frameStyle,
    frame_color: parsed.data.frameColor,
    show_back_text: parsed.data.showBackText,
    spine_letter_spacing: parsed.data.spineLetterSpacing,
    spine_author_name: parsed.data.spineAuthorName,
    title_size: parsed.data.titleSize,
    author_size: parsed.data.authorSize,
    back_text_tone: parsed.data.backTextTone,
  }, { onConflict: "book_id" });
  if (error) {
    console.error("Failed to save book cover", {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    const schemaIsOutdated = error.code === "PGRST204"
      || error.message.includes("show_recipient")
      || error.message.includes("custom_background_path")
      || error.message.includes("title_position")
      || error.message.includes("font_style")
      || error.message.includes("text_tone")
      || error.message.includes("overlay_strength")
      || error.message.includes("color_key")
      || error.message.includes("cover_style")
      || error.message.includes("colored_back")
      || error.message.includes("background_inside_frame")
      || error.message.includes("show_frame")
      || error.message.includes("frame_style")
      || error.message.includes("frame_color")
      || error.message.includes("show_back_text")
      || error.message.includes("spine_letter_spacing")
      || error.message.includes("spine_author_name")
      || error.message.includes("title_size")
      || error.message.includes("author_size")
      || error.message.includes("back_text_tone");
    return {
      error: schemaIsOutdated
        ? "База данных не обновлена. Примените последние миграции Supabase и попробуйте снова."
        : "Не удалось сохранить обложку. Попробуйте снова.",
    };
  }

  revalidatePath(`/dashboard/books/${parsed.data.bookId}`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/cover`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}/preview`);
  if (parsed.data.adminMode) {
    revalidatePath(`/admin/books/${parsed.data.bookId}`);
    revalidatePath(`/admin/books/${parsed.data.bookId}/cover`);
    revalidatePath(`/admin/books/${parsed.data.bookId}/print`);
  }
  return { success: true, previousCustomBackgroundPath: previousCover?.custom_background_path ?? null };
}
