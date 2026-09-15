import "server-only";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDeliveryError, DELIVERY_MIGRATION_ERROR, type BookDelivery } from "@/lib/books/delivery";

export async function getAdminBookDelivery(bookId: string): Promise<{ delivery: BookDelivery | null; error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { delivery: null, error: "Недостаточно прав" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { delivery: null, error: "Supabase не настроен" };
  const { data, error } = await admin.from("book_deliveries").select("pickup, city, address").eq("book_id", bookId).maybeSingle();
  if (error) return { delivery: null, error: getDeliveryError(error) === DELIVERY_MIGRATION_ERROR ? DELIVERY_MIGRATION_ERROR : "Не удалось загрузить доставку. Обновите страницу перед изменением данных." };
  return { delivery: data ? { pickup: data.pickup === true, city: data.city ?? "", address: data.address ?? "" } : null };
}
