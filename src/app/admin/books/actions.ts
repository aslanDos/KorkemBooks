"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookProductionStatus } from "@/lib/books/production-status";

const schema = z.object({ bookId: z.uuid(), status: z.enum(["writing", "editing", "ready", "delivery", "received"]) });

const ADMIN_STATUS_TRANSITIONS: Record<BookProductionStatus, BookProductionStatus[]> = {
  writing: ["editing"],
  editing: ["writing"],
  approval: [],
  printing: ["ready", "editing"],
  ready: ["delivery", "editing"],
  delivery: ["received", "editing"],
  received: ["editing"],
};

export async function updateBookProductionStatus(formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = schema.safeParse({ bookId: formData.get("bookId"), status: formData.get("status") });
  if (!parsed.success) return { error: "Некорректный этап книги" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: book } = await admin.from("books").select("production_status").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  const currentStatus = book?.production_status as BookProductionStatus | undefined;
  if (!currentStatus || !ADMIN_STATUS_TRANSITIONS[currentStatus].includes(parsed.data.status)) return { error: "Этот переход между этапами недоступен" };
  const { data: updated, error } = await admin.from("books").update({ production_status: parsed.data.status }).eq("id", parsed.data.bookId).eq("production_status", currentStatus).select("id").maybeSingle();
  if (error || !updated) return { error: "Не удалось сменить этап. Обновите страницу" };
  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}`, "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/books", "layout");
  return {};
}
