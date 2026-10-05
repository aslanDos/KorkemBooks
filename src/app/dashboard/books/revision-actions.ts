"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshBookPageProgress } from "@/lib/books/queries";

export type RevisionDecisionResult = { error?: string; success?: string };

function refreshRevisionPages(bookId: string) {
  revalidatePath(`/dashboard/books/${bookId}`);
  revalidatePath(`/admin/books/${bookId}`);
}

async function getOwnerBook(bookId: string) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: book } = await supabase.from("books").select("id").eq("id", bookId).eq("owner_id", user.id).eq("production_status", "editing").is("deleted_at", null).maybeSingle();
  return book ? { admin, userId: user.id } : null;
}

export async function reviewAnswerRevisionAction(revisionIdValue: string, bookIdValue: string, decisionValue: string): Promise<RevisionDecisionResult> {
  const parsed = z.object({ revisionId: z.uuid(), bookId: z.uuid(), decision: z.enum(["accepted", "rejected"]) }).safeParse({ revisionId: revisionIdValue, bookId: bookIdValue, decision: decisionValue });
  if (!parsed.success) return { error: "Некорректное решение" };
  const context = await getOwnerBook(parsed.data.bookId);
  if (!context) return { error: "Книга недоступна для проверки" };
  const { data: revision } = await context.admin.from("answer_revisions").select("id").eq("id", parsed.data.revisionId).eq("book_id", parsed.data.bookId).eq("status", "pending").maybeSingle();
  if (!revision) return { error: "Исправление уже рассмотрено или относится к другой книге" };
  const { data, error } = await context.admin.rpc("review_answer_revision", { target_revision_id: parsed.data.revisionId, target_owner_id: context.userId, decision: parsed.data.decision });
  if (error) return { error: "Не удалось сохранить решение. Проверьте миграции базы данных" };
  if (data !== true) return { error: "Исправление уже рассмотрено или относится к другой книге" };
  if (parsed.data.decision === "accepted") await refreshBookPageProgress(context.admin, parsed.data.bookId);
  refreshRevisionPages(parsed.data.bookId);
  return { success: parsed.data.decision === "accepted" ? "Исправление принято" : "Оригинал сохранён" };
}

export async function reviewAllAnswerRevisionsAction(bookIdValue: string, decisionValue: string): Promise<RevisionDecisionResult> {
  const parsed = z.object({ bookId: z.uuid(), decision: z.enum(["accepted", "rejected"]) }).safeParse({ bookId: bookIdValue, decision: decisionValue });
  if (!parsed.success) return { error: "Некорректное решение" };
  const context = await getOwnerBook(parsed.data.bookId);
  if (!context) return { error: "Книга недоступна для проверки" };
  const { data, error } = await context.admin.rpc("review_all_answer_revisions", { target_book_id: parsed.data.bookId, target_owner_id: context.userId, decision: parsed.data.decision });
  if (error) return { error: "Не удалось сохранить решения. Проверьте миграции базы данных" };
  if (parsed.data.decision === "accepted") await refreshBookPageProgress(context.admin, parsed.data.bookId);
  refreshRevisionPages(parsed.data.bookId);
  return { success: `Рассмотрено исправлений: ${Number(data ?? 0)}` };
}
