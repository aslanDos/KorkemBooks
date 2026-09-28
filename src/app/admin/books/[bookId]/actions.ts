"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bookDeliverySchema, getDeliveryError, type BookDeliveryState } from "@/lib/books/delivery";
import { refreshBookPageProgress } from "@/lib/books/queries";

export type AdminAnswerState = { error?: string; success?: boolean };
const answerSchema = z.object({ bookId: z.string().uuid(), questionId: z.string().uuid(), answerText: z.string().max(50000, "Ответ слишком длинный") });

export async function saveBookDeliveryAction(_: BookDeliveryState, formData: FormData): Promise<BookDeliveryState> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const pickup = formData.get("pickup") === "on";
  const parsed = bookDeliverySchema.safeParse({ bookId: formData.get("bookId"), pickup, city: pickup ? "" : formData.get("city") ?? "", address: pickup ? "" : formData.get("address") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные доставки" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Supabase не настроен" };
  const { data: book, error: bookError } = await admin.from("books").select("id").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  if (bookError) return { error: "Не удалось проверить книгу" };
  if (!book) return { error: "Книга не найдена" };
  const { error } = await admin.from("book_deliveries").upsert({ book_id: parsed.data.bookId, pickup, city: parsed.data.city, address: parsed.data.address }, { onConflict: "book_id" });
  if (error) return { error: getDeliveryError(error) };
  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  return { success: true, delivery: { pickup, city: parsed.data.city, address: parsed.data.address } };
}

export async function saveAdminAnswerAction(_: AdminAnswerState, formData: FormData): Promise<AdminAnswerState> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = answerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте ответ" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Supabase не настроен" };
  const { data: question } = await admin.from("questions").select("id, book_id").eq("id", parsed.data.questionId).eq("book_id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  const { data: book } = await admin.from("books").select("owner_id, production_status").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  if (!question || !book) return { error: "Книга или вопрос не найдены" };
  if (book.production_status !== "writing" && book.production_status !== "editing") return { error: "Макет уже на согласовании или в производстве" };
  const answerText = parsed.data.answerText.trim();
  const { error } = await admin.from("answers").upsert({ question_id: question.id, book_id: parsed.data.bookId, owner_id: book.owner_id, answer_text: answerText, answer_format: { version: 1, marks: [] }, answered_at: answerText ? new Date().toISOString() : null }, { onConflict: "question_id" });
  if (error) return { error: "Не удалось сохранить ответ" };
  await refreshBookPageProgress(admin, parsed.data.bookId);
  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}`, "layout");
  return { success: true };
}

export async function updateBookLanguageAction(bookIdValue: string, languageValue: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав для смены языка" };
  const bookId = z.string().uuid().safeParse(bookIdValue);
  if (!bookId.success || (languageValue !== "ru" && languageValue !== "kk")) return { error: "Некорректный язык книги" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Подключение к базе данных не настроено" };
  const { data: currentBook } = await admin.from("books").select("production_status").eq("id", bookId.data).is("deleted_at", null).maybeSingle();
  if (!currentBook || (currentBook.production_status !== "writing" && currentBook.production_status !== "editing")) return { error: "Язык можно менять только во время подготовки книги" };
  const { data: updated, error } = await admin.rpc("set_book_language", { target_book_id: bookId.data, target_language: languageValue });
  if (error) return { error: `Не удалось сменить язык: ${error.message}` };
  if (updated !== true) return { error: "Книга не найдена или недоступна" };

  const { data: book, error: readError } = await admin.from("books").select("language").eq("id", bookId.data).single();
  if (readError || book?.language !== languageValue) return { error: "Язык не удалось подтвердить. Обновите страницу и попробуйте ещё раз" };

  revalidatePath(`/admin/books/${bookId.data}`, "layout");
  revalidatePath(`/dashboard/books/${bookId.data}`, "layout");
  return {};
}

export async function deleteBookAction(bookIdValue: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав для удаления книги" };
  const bookId = z.string().uuid().safeParse(bookIdValue);
  if (!bookId.success) return { error: "Некорректная книга" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Подключение к базе данных не настроено" };
  const [{ data: book }, { data: images }, { data: cover }] = await Promise.all([
    admin.from("books").select("id").eq("id", bookId.data).is("deleted_at", null).maybeSingle(),
    admin.from("book_page_images").select("storage_path").eq("book_id", bookId.data),
    admin.from("book_covers").select("custom_background_path").eq("book_id", bookId.data).maybeSingle(),
  ]);
  if (!book) return { error: "Книга не найдена или уже удалена" };

  const { data: deleted, error } = await admin
    .from("books")
    .delete()
    .eq("id", bookId.data)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !deleted) return { error: "Не удалось удалить книгу. Проверьте, что применены последние миграции" };

  const imagePaths = [...new Set((images ?? []).map((image) => image.storage_path).filter(Boolean))];
  const cleanupResults = await Promise.all([
    imagePaths.length ? admin.storage.from("book-images").remove(imagePaths) : Promise.resolve({ error: null }),
    cover?.custom_background_path ? admin.storage.from("book-cover-images").remove([cover.custom_background_path]) : Promise.resolve({ error: null }),
  ]);
  if (cleanupResults.some((result) => result.error)) console.error("Book deleted, but some storage files could not be removed", { bookId: bookId.data });

  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/books", "layout");
  return {};
}
