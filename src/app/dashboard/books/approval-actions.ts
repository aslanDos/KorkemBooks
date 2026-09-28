"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BookApprovalState = { error?: string; success?: string };

function refreshBook(bookId: string) {
  revalidatePath(`/dashboard/books/${bookId}`, "layout");
  revalidatePath(`/admin/books/${bookId}`, "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/books", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/books", "layout");
}

export async function requestBookApprovalAction(_: BookApprovalState, formData: FormData): Promise<BookApprovalState> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const bookId = z.uuid().safeParse(formData.get("bookId"));
  if (!bookId.success) return { error: "Книга не найдена" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data, error } = await admin.rpc("request_book_approval", { target_book_id: bookId.data });
  if (error) return { error: "Не удалось отправить книгу на согласование. Проверьте миграции базы данных" };
  if (data !== true) return { error: "Книга уже перешла на другой этап. Обновите страницу" };

  refreshBook(bookId.data);
  return { success: "Книга отправлена пользователю на согласование" };
}

const decisionSchema = z.object({
  bookId: z.uuid(),
  decision: z.enum(["approved", "changes_requested"]),
  feedback: z.string().trim().max(2000, "Комментарий слишком длинный"),
}).superRefine((value, context) => {
  if (value.decision === "changes_requested" && !value.feedback) {
    context.addIssue({ code: "custom", path: ["feedback"], message: "Опишите, что нужно исправить" });
  }
});

export async function decideBookApprovalAction(_: BookApprovalState, formData: FormData): Promise<BookApprovalState> {
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!supabase || !admin) return { error: "Сервис временно недоступен" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Войдите в аккаунт ещё раз" };

  const { data: book } = await supabase.from("books")
    .select("id").eq("id", parsed.data.bookId).eq("owner_id", user.id)
    .eq("production_status", "approval").is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга уже не ожидает вашего решения. Обновите страницу" };

  const { data, error } = await admin.rpc("decide_book_approval", {
    target_book_id: book.id,
    target_owner_id: user.id,
    decision: parsed.data.decision,
    decision_feedback: parsed.data.feedback || null,
  });
  if (error) return { error: "Не удалось сохранить решение. Попробуйте ещё раз" };
  if (data !== true) return { error: "Состояние книги изменилось. Обновите страницу" };

  refreshBook(book.id);
  return { success: parsed.data.decision === "approved" ? "Макет подтверждён и передан в печать" : "Запрос правок отправлен команде" };
}
