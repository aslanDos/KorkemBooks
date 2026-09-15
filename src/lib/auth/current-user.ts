import { cache } from "react";
import { getDevUser } from "./dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "user";

export type CurrentUser = {
  email: string;
  phone?: string;
  role: AppRole;
  displayName?: string;
  isDevelopmentUser: boolean;
};

function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "manager" || value === "user";
}

// Deduplicate within one server render; never share session data across requests.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const devUser = await getDevUser();
  if (devUser) return { ...devUser, role: "admin", isDevelopmentUser: true };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, phone_e164")
    .eq("id", user.id)
    .maybeSingle();

  return {
    email: user.email,
    phone: profile?.phone_e164 ?? user.phone,
    role: isAppRole(profile?.role) ? profile.role : "user",
    displayName: profile?.display_name ?? undefined,
    isDevelopmentUser: false,
  };
});
