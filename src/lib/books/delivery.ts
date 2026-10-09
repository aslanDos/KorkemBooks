import { z } from "zod";

export type BookDelivery = { city: string; address: string };
export type BookDeliveryState = { error?: string; success?: boolean; delivery?: BookDelivery };
export const DELIVERY_MIGRATION_ERROR = "Для сохранения доставки примените последние миграции Supabase и обновите страницу.";

export const bookDeliverySchema = z.object({
  bookId: z.string().uuid("Некорректная книга"),
  city: z.string().trim().min(1, "Укажите город").max(120, "Название города слишком длинное"),
  address: z.string().trim().min(1, "Укажите адрес").max(500, "Адрес слишком длинный"),
});

export function getDeliveryError(error: { code?: string }) {
  return ["PGRST205", "42P01", "PGRST204", "42703"].includes(error.code ?? "") ? DELIVERY_MIGRATION_ERROR : "Не удалось сохранить доставку. Попробуйте снова.";
}
