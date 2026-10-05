"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bookDeliverySchema, getDeliveryError, type BookDeliveryState } from "@/lib/books/delivery";
export type RevisionImportPreview = {
  questionId: string;
  question: string;
  originalAnswer: string;
  editedAnswer: string;
  changed: boolean;
};
export type RevisionImportState = { error?: string; success?: string; items?: RevisionImportPreview[]; json?: string };
const revisionRowSchema = z.object({ questionId: z.uuid(), editedAnswer: z.string().max(50000, "Исправленный ответ слишком длинный") }).strict();
const revisionImportSchema = z.array(revisionRowSchema).min(1, "Файл не содержит исправлений").max(1000, "В файле слишком много записей");

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

async function validateRevisionJson(bookIdValue: unknown, jsonValue: unknown): Promise<RevisionImportState> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const bookId = z.uuid().safeParse(bookIdValue);
  if (!bookId.success || typeof jsonValue !== "string" || jsonValue.length > 50_000_000) return { error: "Некорректный файл импорта" };
  let decoded: unknown;
  try { decoded = JSON.parse(jsonValue); } catch { return { error: "Файл не является корректным JSON" }; }
  const parsed = revisionImportSchema.safeParse(decoded);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Некорректная структура JSON" };
  const ids = parsed.data.map((row) => row.questionId);
  if (new Set(ids).size !== ids.length) return { error: "В файле есть повторяющиеся questionId" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Supabase не настроен" };
  const { data: book } = await admin.from("books").select("id, production_status").eq("id", bookId.data).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  if (book.production_status !== "editing") return { error: "Импорт доступен только на этапе редактуры" };
  const { error: captureError } = await admin.rpc("capture_book_answer_originals", { target_book_id: book.id });
  if (captureError) return { error: "Не удалось получить оригиналы. Примените последнюю миграцию базы данных" };
  const [{ data: originals, error: originalsError }, { data: questions, error: questionsError }] = await Promise.all([
    admin.from("book_answer_originals").select("question_id, original_answer").eq("book_id", book.id).in("question_id", ids),
    admin.from("questions").select("id, prompt").eq("book_id", book.id).is("deleted_at", null).in("id", ids),
  ]);
  if (originalsError || questionsError) return { error: "Не удалось проверить исправления" };
  const originalsById = new Map((originals ?? []).filter((row) => row.original_answer.trim().length > 0).map((row) => [row.question_id, row.original_answer]));
  const promptsById = new Map((questions ?? []).map((row) => [row.id, row.prompt]));
  const unknown = ids.filter((id) => !originalsById.has(id) || !promptsById.has(id));
  if (unknown.length) return { error: `Файл содержит ${unknown.length} неизвестных questionId или ответы от другой книги` };
  const items = parsed.data.map((row) => ({
    ...row,
    question: promptsById.get(row.questionId) ?? "",
    originalAnswer: originalsById.get(row.questionId) ?? "",
    changed: originalsById.get(row.questionId) !== row.editedAnswer,
  }));
  return { items, json: JSON.stringify(parsed.data) };
}

export async function validateRevisionImportAction(bookId: string, json: string): Promise<RevisionImportState> {
  return validateRevisionJson(bookId, json);
}

export async function importAnswerRevisionsAction(bookId: string, json: string): Promise<RevisionImportState> {
  const preview = await validateRevisionJson(bookId, json);
  if (preview.error || !preview.items || !preview.json) return preview;
  const changed = preview.items.filter((item) => item.changed);
  if (!changed.length) return { error: "В файле нет изменений относительно оригинала", items: preview.items, json: preview.json };
  const user = await getCurrentUser();
  const admin = createSupabaseAdminClient();
  if (!admin || user?.role !== "admin") return { error: "Недостаточно прав" };
  const { data, error } = await admin.rpc("import_answer_revisions", {
    target_book_id: bookId,
    revision_rows: changed.map((item) => ({ question_id: item.questionId, edited_answer: item.editedAnswer })),
    actor_id: user.id,
  });
  if (error) return { error: `Не удалось импортировать исправления: ${error.message}` };
  revalidatePath(`/admin/books/${bookId}`, "layout");
  revalidatePath(`/dashboard/books/${bookId}`, "layout");
  return { success: `Импортировано исправлений: ${Number(data ?? changed.length)}` };
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
    admin.from("book_page_images").select("storage_path, collage_images").eq("book_id", bookId.data),
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

  const imagePaths = [...new Set((images ?? []).flatMap((image) => [
    image.storage_path,
    ...(Array.isArray(image.collage_images) ? image.collage_images.flatMap((item) => item && typeof item === "object" && "storagePath" in item && typeof item.storagePath === "string" ? [item.storagePath] : []) : []),
  ]).filter(Boolean))];
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
