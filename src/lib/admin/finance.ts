import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookFinance, FinanceEntry, FinanceKind, FinancePeriod } from "./finance-types";
export type { BookFinance, FinanceEntry, FinanceKind, FinancePeriod } from "./finance-types";

export function financeTotals(price: number | null, entries: FinanceEntry[]): BookFinance {
  const active = entries.filter((entry) => !entry.voidedAt);
  const sum = (kind: FinanceKind) => active.filter((entry) => entry.kind === kind).reduce((total, entry) => total + entry.amount, 0);
  const deposit = sum("deposit");
  const refunds = sum("refund");
  const printing = sum("printing");
  const delivery = sum("delivery");
  const otherCosts = sum("other_cost");
  const received = deposit + sum("payment") - refunds;
  const costs = printing + delivery + otherCosts;
  return { price, entries, deposit, received, refunds, printing, delivery, otherCosts, costs, cashResult: received - costs, outstanding: price === null ? null : Math.max(price - received, 0) };
}

function mapEntry(row: { id: string; book_id: string; kind: string; amount_kzt: number | string; occurred_on: string; note: string; created_at: string; voided_at: string | null }): FinanceEntry {
  return { id: row.id, bookId: row.book_id, kind: row.kind as FinanceKind, amount: Number(row.amount_kzt), occurredOn: row.occurred_on, note: row.note, createdAt: row.created_at, voidedAt: row.voided_at };
}

export async function getBookFinance(bookId: string): Promise<{ finance: BookFinance | null; error?: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { finance: null, error: "Сервис временно недоступен" };
  const { data: row, error: priceError } = await admin.from("book_finances").select("agreed_price_kzt").eq("book_id", bookId).maybeSingle();
  if (priceError) return { finance: null, error: "Не удалось загрузить финансы. Проверьте, что применена миграция базы данных." };
  const entries: FinanceEntry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("book_finance_entries")
      .select("id, book_id, kind, amount_kzt, occurred_on, note, created_at, voided_at")
      .eq("book_id", bookId).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (error) return { finance: null, error: "Не удалось загрузить операции книги." };
    entries.push(...(data ?? []).map(mapEntry));
    if (!data || data.length < 1000) break;
  }
  return { finance: financeTotals(row ? Number(row.agreed_price_kzt) : null, entries) };
}

const zone = "Asia/Almaty";
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
export function todayInAlmaty(now = new Date()): string {
  const parts = Object.fromEntries(dateFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateFromKey(key: string): Date { return new Date(`${key}T00:00:00Z`); }
function keyFromDate(date: Date): string { return date.toISOString().slice(0, 10); }
function shiftDays(key: string, days: number): string { const date = dateFromKey(key); date.setUTCDate(date.getUTCDate() + days); return keyFromDate(date); }
function weekKey(key: string): string { return shiftDays(key, -(dateFromKey(key).getUTCDay() + 6) % 7); }
function monthKey(key: string): string { return `${key.slice(0, 7)}-01`; }
function shiftMonths(key: string, months: number): string { const date = dateFromKey(monthKey(key)); date.setUTCMonth(date.getUTCMonth() + months); return keyFromDate(date); }
function bucketKey(key: string, period: FinancePeriod): string { return period === "day" ? key : period === "week" ? weekKey(key) : monthKey(key); }

export type FinanceBucket = { key: string; label: string; received: number; refunds: number; costs: number };
function bucketLabel(key: string, period: FinancePeriod): string {
  if (period === "day") return new Intl.DateTimeFormat("ru-KZ", { day: "numeric", month: "short", timeZone: "UTC" }).format(dateFromKey(key));
  if (period === "week") return `с ${new Intl.DateTimeFormat("ru-KZ", { day: "numeric", month: "short", timeZone: "UTC" }).format(dateFromKey(key))}`;
  return new Intl.DateTimeFormat("ru-KZ", { month: "short", year: "numeric", timeZone: "UTC" }).format(dateFromKey(key));
}

export function buildFinanceBuckets(entries: FinanceEntry[], period: FinancePeriod, today = todayInAlmaty()): FinanceBucket[] {
  const current = bucketKey(today, period);
  const count = period === "day" ? 30 : 12;
  const keys = Array.from({ length: count }, (_, index) => {
    const offset = index - count + 1;
    return period === "day" ? shiftDays(current, offset) : period === "week" ? shiftDays(current, offset * 7) : shiftMonths(current, offset);
  });
  const buckets = keys.map((key) => ({ key, label: bucketLabel(key, period), received: 0, refunds: 0, costs: 0 }));
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const entry of entries) {
    if (entry.voidedAt) continue;
    const bucket = byKey.get(bucketKey(entry.occurredOn, period));
    if (!bucket) continue;
    if (entry.kind === "deposit" || entry.kind === "payment") bucket.received += entry.amount;
    else if (entry.kind === "refund") bucket.refunds += entry.amount;
    else bucket.costs += entry.amount;
  }
  return buckets;
}

export async function getFinanceAnalytics(period: FinancePeriod) {
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Сервис временно недоступен" } as const;
  const bookRows: Array<{ id: string; title: string; production_status: string }> = [];
  const prices: Array<{ book_id: string; agreed_price_kzt: number | string }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("books").select("id, title, production_status").is("deleted_at", null).order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (error) return { error: "Не удалось загрузить книги." } as const;
    bookRows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("book_finances").select("book_id, agreed_price_kzt").order("book_id").range(offset, offset + 999);
    if (error) return { error: "Не удалось загрузить цены. Проверьте миграцию базы данных." } as const;
    prices.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const entries: FinanceEntry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("book_finance_entries")
      .select("id, book_id, kind, amount_kzt, occurred_on, note, created_at, voided_at")
      .order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 999);
    if (error) return { error: "Не удалось загрузить финансовые операции." } as const;
    entries.push(...(data ?? []).map(mapEntry));
    if (!data || data.length < 1000) break;
  }

  const priceByBook = new Map(prices.map((row) => [row.book_id, Number(row.agreed_price_kzt)]));
  const activeBookIds = new Set(bookRows.map((row) => row.id));
  const activeEntries = entries.filter((entry) => activeBookIds.has(entry.bookId));
  const byBook = new Map<string, FinanceEntry[]>();
  for (const entry of activeEntries) byBook.set(entry.bookId, [...(byBook.get(entry.bookId) ?? []), entry]);
  const books = bookRows.map((row) => ({
    id: row.id, title: row.title, status: row.production_status,
    finance: financeTotals(priceByBook.get(row.id) ?? null, byBook.get(row.id) ?? []),
  }));
  const buckets = buildFinanceBuckets(activeEntries, period);
  const periodRefunds = buckets.reduce((sum, bucket) => sum + bucket.refunds, 0);
  const periodReceived = buckets.reduce((sum, bucket) => sum + bucket.received, 0) - periodRefunds;
  const periodCosts = buckets.reduce((sum, bucket) => sum + bucket.costs, 0);
  return { books, buckets, periodReceived, periodRefunds, periodCosts, periodResult: periodReceived - periodCosts,
    agreedTotal: books.reduce((sum, book) => sum + (book.finance.price ?? 0), 0),
    outstandingTotal: books.reduce((sum, book) => sum + (book.finance.outstanding ?? 0), 0),
    completedValue: books.filter((book) => book.status === "received").reduce((sum, book) => sum + (book.finance.price ?? 0), 0),
    allReceived: books.reduce((sum, book) => sum + book.finance.received, 0),
    allCosts: books.reduce((sum, book) => sum + book.finance.costs, 0),
  };
}
