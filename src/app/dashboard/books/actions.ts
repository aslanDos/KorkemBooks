"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { refreshBookPageProgress } from "@/lib/books/queries";
import { isAvailableBookLanguage, isBookLanguage } from "@/lib/books/language";
import { isRemovedBookTypeSlug } from "@/lib/books/catalog";

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
  if (progress < 50) return { error: "В книге должно быть минимум 50 страниц" };

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
    .select("role, book_type_id, book_language")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Профиль не найден" };
  const isAdmin = profile.role === "admin";
  if (!isAdmin) {
    const { data: existingBook } = await supabase
      .from("books")
      .select("id")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existingBook) return { error: "Сейчас один пользователь может создать только одну книгу" };
  }

  const typeId = isAdmin ? z.string().uuid().safeParse(formData.get("typeId")) : null;
  if (isAdmin && !typeId?.success) return { error: "Выберите тип получателя" };
  const selectedTypeId = isAdmin ? (typeId?.success ? typeId.data : null) : profile.book_type_id;
  if (!selectedTypeId) return { error: "Тип получателя не назначен. Обратитесь к администратору" };
  const requestedLanguage = formData.get("language");
  const selectedLanguage = isAdmin
    ? (isAvailableBookLanguage(requestedLanguage) ? requestedLanguage : null)
    : (isBookLanguage(profile.book_language) ? profile.book_language : null);
  if (!selectedLanguage) return { error: isAdmin ? "Выберите язык книги" : "Язык книги не назначен. Обратитесь к администратору" };

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
    language: selectedLanguage,
  }).select("id").single();

  if (error || !book) return { error: !isAdmin && error?.code === "23505" ? "Сейчас один пользователь может создать только одну книгу" : "Не удалось создать книгу. Попробуйте ещё раз" };
  redirect(`/dashboard/books/${book.id}`);
}

export async function updateBookAction(_: UpdateBookState, formData: FormData): Promise<UpdateBookState> {
  const parsed = updateBookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Подключение к Supabase не настроено" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла. Войдите снова" };

  const { data: updated, error } = await supabase
    .from("books")
    .update({ title: parsed.data.title, author_name: parsed.data.authorName, recipient_name: parsed.data.recipientName })
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
