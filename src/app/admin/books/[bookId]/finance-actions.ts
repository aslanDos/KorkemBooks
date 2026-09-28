"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayInAlmaty } from "@/lib/admin/finance";

const priceSchema = z.object({ bookId: z.uuid(), price: z.coerce.number<number>().int().min(0).max(999999999999) });
const entrySchema = z.object({
  bookId: z.uuid(),
  kind: z.enum(["deposit", "payment", "refund", "printing", "delivery", "other_cost"]),
  amount: z.coerce.number<number>().int().min(1).max(999999999999),
  occurredOn: z.iso.date(),
  note: z.string().trim().max(500),
});

function revalidateFinance(bookId: string) {
  revalidatePath(`/admin/books/${bookId}`);
  revalidatePath("/admin/analytics");
  revalidatePath("/admin");
}

export async function saveBookPriceAction(input: { bookId: string; price: string }): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  if (input.price.trim() === "") return { error: "Укажите цену книги" };
  const parsed = priceSchema.safeParse(input);
  if (!parsed.success) return { error: "Укажите целую сумму в тенге" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: book } = await admin.from("books").select("id").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  const { error } = await admin.from("book_finances").upsert({ book_id: book.id, agreed_price_kzt: parsed.data.price, updated_at: new Date().toISOString(), updated_by_email: user.email }, { onConflict: "book_id" });
  if (error) return { error: "Не удалось сохранить цену. Проверьте миграцию базы данных." };
  revalidateFinance(book.id);
  return { success: true };
}

export async function addBookFinanceEntryAction(input: { bookId: string; kind: string; amount: string; occurredOn: string; note: string }): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте сумму, дату и комментарий" };
  if (parsed.data.occurredOn > todayInAlmaty()) return { error: "Дата операции не может быть в будущем" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: book } = await admin.from("books").select("id").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  const { data: price } = await admin.from("book_finances").select("book_id").eq("book_id", book.id).maybeSingle();
  if (!price) return { error: "Сначала укажите согласованную цену книги" };
  const { error } = await admin.from("book_finance_entries").insert({
    book_id: book.id, kind: parsed.data.kind, amount_kzt: parsed.data.amount,
    occurred_on: parsed.data.occurredOn, note: parsed.data.note, recorded_by_email: user.email,
  });
  if (error) return { error: error.message.includes("finance_refund_exceeds_received")
    ? "Возврат не может быть больше полученных денег"
    : "Не удалось записать операцию" };
  revalidateFinance(book.id);
  return { success: true };
}

export async function voidBookFinanceEntryAction(input: { bookId: string; entryId: string }): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { error: "Недостаточно прав" };
  const parsed = z.object({ bookId: z.uuid(), entryId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Некорректная операция" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" };
  const { data: book } = await admin.from("books").select("id").eq("id", parsed.data.bookId).is("deleted_at", null).maybeSingle();
  if (!book) return { error: "Книга не найдена" };
  const { data: updated, error } = await admin.from("book_finance_entries")
    .update({ voided_at: new Date().toISOString(), voided_by_email: user.email })
    .eq("id", parsed.data.entryId).eq("book_id", parsed.data.bookId).is("voided_at", null)
    .select("id").maybeSingle();
  if (error) return { error: error.message.includes("finance_refund_exceeds_received")
    ? "Сначала отмените связанные возвраты: иначе они превысят оставшиеся поступления"
    : "Не удалось отменить операцию" };
  if (!updated) return { error: "Операция уже отменена или не найдена" };
  revalidateFinance(parsed.data.bookId);
  return { success: true };
}
