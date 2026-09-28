"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAnswerFormat } from "@/lib/books/answer-format";
import { refreshBookPageProgress } from "@/lib/books/queries";

const saveAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().max(50000),
  answerFormat: z.unknown().optional(),
});
const saveAnswersSchema = z.array(saveAnswerSchema).min(1).max(100);

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
  return { success: true };
}

export async function saveAnswersAction(input: Array<{ questionId: string; answerText: string; answerFormat?: unknown }>) {
  const parsed = saveAnswersSchema.safeParse(input);
  if (!parsed.success) return { error: "Ответ слишком длинный" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase не настроен" };
  const questionIds = parsed.data.map((answer) => answer.questionId);
  const [{ data: { user } }, { data: questions }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("questions").select("id, book_id").in("id", questionIds).is("deleted_at", null),
  ]);
  if (!user) return { error: "Сессия истекла" };
  if (!questions || questions.length !== questionIds.length) return { error: "Вопрос не найден" };
  const bookIds = [...new Set(questions.map((question) => question.book_id))];
  if (bookIds.length !== 1) return { error: "Ответы относятся к разным книгам" };
  const bookId = bookIds[0];
  const { data: book } = await supabase.from("books").select("production_status").eq("id", bookId).eq("owner_id", user.id).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  if (book.production_status !== "writing") return { error: "Книга уже отправлена на редактуру и доступна только для просмотра" };

  const { error } = await supabase.from("answers").upsert(parsed.data.map((answer) => ({
    question_id: answer.questionId,
    book_id: bookId,
    owner_id: user.id,
    answer_text: answer.answerText,
    answer_format: normalizeAnswerFormat(answer.answerFormat, answer.answerText.length),
    answered_at: answer.answerText.trim() ? new Date().toISOString() : null,
  })), { onConflict: "question_id" });
  if (error) return { error: "Не удалось сохранить ответ" };

  const progress = await refreshBookPageProgress(supabase, bookId);
  if (progress === null) return { error: "Ответ сохранён, но не удалось обновить прогресс. Попробуйте сохранить ещё раз." };

  return { success: true, progress };
}
