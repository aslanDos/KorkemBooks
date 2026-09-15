"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAnswerFormat } from "@/lib/books/answer-format";

const saveAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().max(50000),
  answerFormat: z.unknown().optional(),
});

const readingPositionSchema = z.object({
  bookId: z.string().uuid(),
  questionId: z.string().uuid(),
});

export async function saveReadingPositionAction(input: { bookId: string; questionId: string }) {
  const parsed = readingPositionSchema.safeParse(input);
  if (!parsed.success) return { error: "Некорректный вопрос" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла" };

  const { data: question } = await supabase
    .from("questions")
    .select("id")
    .eq("id", parsed.data.questionId)
    .eq("book_id", parsed.data.bookId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!question) return { error: "Вопрос не найден" };

  const { error } = await supabase.from("book_reading_positions").upsert({
    book_id: parsed.data.bookId,
    owner_id: user.id,
    question_id: parsed.data.questionId,
  }, { onConflict: "book_id,owner_id" });
  if (error) return { error: "Не удалось сохранить позицию" };
  revalidatePath(`/dashboard/books/${parsed.data.bookId}`);
  return { success: true };
}

export async function saveAnswerAction(input: { questionId: string; answerText: string; answerFormat?: unknown }) {
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) return { error: "Ответ слишком длинный" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Сессия истекла" };

  const { data: question } = await supabase
    .from("questions")
    .select("id, chapter_id")
    .eq("id", parsed.data.questionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!question) return { error: "Вопрос не найден" };

  const { data: chapter } = await supabase
    .from("chapters")
    .select("book_id")
    .eq("id", question.chapter_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!chapter) return { error: "Глава не найдена" };
  const { data: book } = await supabase.from("books").select("production_status").eq("id", chapter.book_id).eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  if (book.production_status !== "writing") return { error: "Книга уже отправлена на редактуру и доступна только для просмотра" };

  const answerText = parsed.data.answerText;
  const answerFormat = normalizeAnswerFormat(parsed.data.answerFormat, answerText.length);
  const hasAnswer = Boolean(answerText.trim());
  const { error } = await supabase.from("answers").upsert({
    question_id: question.id,
    book_id: chapter.book_id,
    owner_id: user.id,
    answer_text: answerText,
    answer_format: answerFormat,
    answered_at: hasAnswer ? new Date().toISOString() : null,
  }, { onConflict: "question_id" });
  if (error) return { error: "Не удалось сохранить ответ" };

  const { data: progress, error: progressError } = await supabase.rpc("refresh_book_progress", { target_book_id: chapter.book_id });
  if (progressError) return { error: "Ответ сохранён, но не удалось обновить прогресс. Попробуйте сохранить ещё раз." };

  return { success: true, progress };
}
