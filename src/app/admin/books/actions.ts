"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ bookId: z.uuid(), status: z.enum(["writing", "editing", "printing", "ready", "delivery", "received"]) });

export async function updateBookProductionStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return;
  const parsed = schema.safeParse({ bookId: formData.get("bookId"), status: formData.get("status") });
  if (!parsed.success) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("books").update({ production_status: parsed.data.status }).eq("id", parsed.data.bookId);
  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  revalidatePath(`/dashboard/books/${parsed.data.bookId}`, "layout");
}
