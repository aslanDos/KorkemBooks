"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitBookForEditingAction(formData: FormData) {
  const bookId = z.string().uuid().safeParse(formData.get("bookId"));
  if (!bookId.success) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: progress, error: progressError } = await supabase.rpc("refresh_book_progress", { target_book_id: bookId.data });
  if (progressError || progress === null || progress < 50) return;

  await supabase.from("books").update({ production_status: "editing" }).eq("id", bookId.data).eq("owner_id", user.id).eq("production_status", "writing").is("deleted_at", null);
  revalidatePath(`/dashboard/books/${bookId.data}`, "layout");
  revalidatePath("/admin/books", "layout");
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

  const { data: existingBook } = await supabase
    .from("books")
    .select("id")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existingBook) return { error: "Сейчас один пользователь может создать только одну книгу" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("book_type_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.book_type_id) return { error: "Тип получателя не назначен. Обратитесь к администратору" };

  const { data: bookType } = await supabase
    .from("book_types")
    .select("id")
    .eq("id", profile.book_type_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!bookType) return { error: "Выбранный тип книги недоступен" };

  const { data: book, error } = await supabase.from("books").insert({
    owner_id: user.id,
    type_id: bookType.id,
    title: parsed.data.title,
    author_name: parsed.data.authorName,
    recipient_name: parsed.data.recipientName,
  }).select("id").single();

  if (error || !book) return { error: error?.code === "23505" ? "Сейчас один пользователь может создать только одну книгу" : "Не удалось создать книгу. Попробуйте ещё раз" };
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
