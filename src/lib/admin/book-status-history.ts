import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookProductionStatus } from "@/lib/books/production-status";

export type BookStatusHistoryEntry = {
  id: number;
  fromStatus: BookProductionStatus | null;
  toStatus: BookProductionStatus;
  changedAt: string;
  actorPhone: string | null;
  actorRole: "admin" | "manager" | "user" | null;
};

export async function attributeLatestBookStatusChange(admin: SupabaseClient, bookId: string, actorId: string | null) {
  if (!actorId) return;
  const { data: entry } = await admin.from("book_status_history").select("id").eq("book_id", bookId).is("changed_by", null).order("changed_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
  if (entry) await admin.from("book_status_history").update({ changed_by: actorId }).eq("id", entry.id).is("changed_by", null);
}

export async function getAdminBookStatusHistory(bookId: string): Promise<{ entries: BookStatusHistoryEntry[]; error?: string }> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return { entries: [], error: "Недостаточно прав" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { entries: [], error: "Supabase не настроен" };

  const { data: rows, error } = await admin.from("book_status_history").select("id, from_status, to_status, changed_by, changed_at").eq("book_id", bookId).order("changed_at", { ascending: false }).order("id", { ascending: false });
  if (error) return { entries: [], error: "Не удалось загрузить историю статусов. Примените последнюю миграцию базы данных." };

  const actorIds = [...new Set((rows ?? []).flatMap((row) => row.changed_by ? [row.changed_by] : []))];
  const { data: profiles } = actorIds.length
    ? await admin.from("profiles").select("id, phone_e164, role").in("id", actorIds)
    : { data: [] };
  const actors = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    entries: (rows ?? []).map((row) => {
      const actor = row.changed_by ? actors.get(row.changed_by) : null;
      return {
        id: Number(row.id),
        fromStatus: row.from_status as BookProductionStatus | null,
        toStatus: row.to_status as BookProductionStatus,
        changedAt: row.changed_at,
        actorPhone: actor?.phone_e164 ?? null,
        actorRole: actor?.role ?? null,
      };
    }),
  };
}
