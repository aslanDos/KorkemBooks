"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshBookPageProgress } from "@/lib/books/queries";
import { isAvailableBookLanguage } from "@/lib/books/language";
import { isRemovedBookTypeSlug } from "@/lib/books/catalog";
import { BOOK_MINIMUM_SUBMISSION_PAGE_COUNT, BOOK_TARGET_PAGE_COUNT } from "@/lib/books/progress";

export type SubmitBookForEditingState = { error?: string; success?: boolean };

export async function submitBookForEditingAction(_: SubmitBookForEditingState, formData: FormData): Promise<SubmitBookForEditingState> {
  const bookId = z.string().uuid().safeParse(formData.get("bookId"));
  if (!bookId.success) return { error: "Книга не найдена" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Сервис временно недоступен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const progress = await refreshBookPageProgress(supabase, bookId.data);
  if (progress === null) return { error: "Не удалось проверить готовность книги" };
  const minimumProgress = Math.floor((BOOK_MINIMUM_SUBMISSION_PAGE_COUNT / BOOK_TARGET_PAGE_COUNT) * 100);
  if (progress < minimumProgress) return { error: `В книге должно быть минимум ${BOOK_MINIMUM_SUBMISSION_PAGE_COUNT} страниц` };

  const { data: updated, error } = await supabase.from("books")
    .update({ production_status: "editing" })
    .eq("id", bookId.data)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { error: `Не удалось отправить книгу: ${error.message}` };
  if (!updated) return { error: "Книга уже отправлена или недоступна" };
  revalidatePath(`/dashboard/books/${bookId.data}`, "layout");
  revalidatePath("/admin/books", "layout");
  return { success: true };
}
import { createBookSchema } from "@/lib/books/validation";
import { updateBookSchema } from "@/lib/books/validation";

export type CreateBookState = { error?: string };
export type UpdateBookState = { error?: string; success?: boolean };

export async function createBookAction(_: CreateBookState, formData: FormData): Promise<CreateBookState> {
  const parsed = createBookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Профиль не найден" };
  const isAdmin = profile.role === "admin";

  if (!isAdmin) {
    const entitlementId = z.string().uuid().safeParse(formData.get("entitlementId"));
    if (!entitlementId.success) return { error: "Выберите доступную книгу" };

    const { data: bookId, error } = await supabase.rpc("create_book_from_entitlement", {
      entitlement_id: entitlementId.data,
      book_title: parsed.data.title,
      book_author_name: parsed.data.authorName,
      book_recipient_name: parsed.data.recipientName,
      book_author_gender: parsed.data.authorGender === "neutral" ? null : parsed.data.authorGender,
      book_recipient_gender: parsed.data.recipientGender === "neutral" ? null : parsed.data.recipientGender,
      book_back_cover_text: parsed.data.backCoverText,
      book_writing_style: parsed.data.writingStyle,
    });

    if (error || !bookId) {
      return { error: error?.message.includes("not available") ? "Эта книга уже создана или больше недоступна" : "Не удалось создать книгу. Попробуйте ещё раз" };
    }
    redirect(`/dashboard/books/${bookId}`);
  }

  const typeId = z.string().uuid().safeParse(formData.get("typeId"));
  if (!typeId.success) return { error: "Выберите тип получателя" };
  const selectedTypeId = typeId.data;
  const requestedLanguage = formData.get("language");
  const selectedLanguage = isAvailableBookLanguage(requestedLanguage) ? requestedLanguage : null;
  if (!selectedLanguage) return { error: "Выберите язык книги" };

  const { data: bookType } = await supabase
    .from("book_types")
    .select("id, slug")
    .eq("id", selectedTypeId)
    .eq("is_active", true)
    .maybeSingle();

  if (!bookType || isRemovedBookTypeSlug(bookType.slug)) return { error: "Выбранный тип книги недоступен" };

  const { data: book, error } = await supabase.from("books").insert({
    owner_id: user.id,
    type_id: bookType.id,
    title: parsed.data.title,
    author_name: parsed.data.authorName,
    recipient_name: parsed.data.recipientName,
    author_gender: parsed.data.authorGender === "neutral" ? null : parsed.data.authorGender,
    recipient_gender: parsed.data.recipientGender === "neutral" ? null : parsed.data.recipientGender,
    back_cover_text: parsed.data.backCoverText,
    language: selectedLanguage,
    writing_style: parsed.data.writingStyle,
  }).select("id").single();

  if (error || !book) return { error: "Не удалось создать книгу. Попробуйте ещё раз" };
  redirect(`/dashboard/books/${book.id}`);
}

export async function updateBookAction(_: UpdateBookState, formData: FormData): Promise<UpdateBookState> {
  const parsed = updateBookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const updates = {
    title: parsed.data.title,
    author_name: parsed.data.authorName,
    recipient_name: parsed.data.recipientName,
    author_gender: parsed.data.authorGender === "neutral" ? null : parsed.data.authorGender,
    recipient_gender: parsed.data.recipientGender === "neutral" ? null : parsed.data.recipientGender,
    back_cover_text: parsed.data.backCoverText,
    ...(parsed.data.writingStyle ? { writing_style: parsed.data.writingStyle } : {}),
  };
  const { data: updated, error } = await supabase
    .from("books")
    .update(updates)
    .eq("id", parsed.data.bookId)
    .eq("owner_id", user.id)
    .eq("production_status", "writing")
    .is("deleted_at", null)
    .select("id").maybeSingle();

  if (error || !updated) return { error: "Не удалось сохранить изменения. Проверьте доступ к книге и её статус." };
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return { success: true };
}
