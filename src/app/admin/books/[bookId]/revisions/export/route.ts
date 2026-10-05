import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const parsedId = z.uuid().safeParse((await params).bookId);
  if (!parsedId.success) return NextResponse.json({ error: "Книга не найдена" }, { status: 404 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase не настроен" }, { status: 503 });
  const { data: book } = await admin.from("books").select("id, production_status").eq("id", parsedId.data).is("deleted_at", null).maybeSingle();
  if (!book) return NextResponse.json({ error: "Книга не найдена" }, { status: 404 });
  if (book.production_status !== "editing") return NextResponse.json({ error: "Экспорт доступен только на этапе редактуры" }, { status: 409 });

  const { error: captureError } = await admin.rpc("capture_book_answer_originals", { target_book_id: book.id });
  if (captureError) return NextResponse.json({ error: "Примените последнюю миграцию базы данных" }, { status: 503 });
  const { data, error } = await admin.from("book_answer_originals")
    .select("question_id, original_answer, questions!inner(prompt, position, chapters!inner(position))")
    .eq("book_id", book.id)
    .order("question_id");
  if (error) return NextResponse.json({ error: "Не удалось подготовить экспорт" }, { status: 500 });
  const rows = (data ?? []).filter((row) => row.original_answer.trim().length > 0).map((row) => {
    const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    return {
      questionId: row.question_id,
      question: question?.prompt ?? "",
      originalAnswer: row.original_answer,
      chapterPosition: Number((Array.isArray(question?.chapters) ? question.chapters[0] : question?.chapters)?.position ?? 0),
      questionPosition: Number(question?.position ?? 0),
    };
  }).sort((a, b) => a.chapterPosition - b.chapterPosition || a.questionPosition - b.questionPosition)
    .map((row) => ({ questionId: row.questionId, question: row.question, originalAnswer: row.originalAnswer }));

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="book-${book.id}-answers.json"`,
      "cache-control": "private, no-store",
    },
  });
}
