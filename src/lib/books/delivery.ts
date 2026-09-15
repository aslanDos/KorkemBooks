import { z } from "zod";

export type BookDelivery = { pickup: boolean; city: string; address: string };
export type BookDeliveryState = { error?: string; success?: boolean };
export const DELIVERY_MIGRATION_ERROR = "Для сохранения доставки примените миграцию Supabase 202609150015_add_book_deliveries.sql и обновите страницу.";

export const bookDeliverySchema = z.object({
  bookId: z.string().uuid("Некорректная книга"),
  pickup: z.boolean(),
  city: z.string().trim().max(120, "Название города слишком длинное"),
  address: z.string().trim().max(500, "Адрес слишком длинный"),
}).superRefine((value, context) => {
  if (!value.pickup && !value.city) context.addIssue({ code: "custom", path: ["city"], message: "Укажите город" });
  if (!value.pickup && !value.address) context.addIssue({ code: "custom", path: ["address"], message: "Укажите адрес" });
});

export function getDeliveryError(error: { code?: string }) {
  return ["PGRST205", "42P01", "PGRST204", "42703"].includes(error.code ?? "") ? DELIVERY_MIGRATION_ERROR : "Не удалось сохранить доставку. Попробуйте снова.";
}
