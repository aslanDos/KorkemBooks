import { cache } from "react";
import { getDevUser } from "./dev-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "manager" | "user";

export type CurrentUser = {
  id: string | null;
  email: string;
  phone?: string;
  role: AppRole;
  isDevelopmentUser: boolean;
};

function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "manager" || value === "user";
}

// Deduplicate within one server render; never share session data across requests.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const devUser = await getDevUser();
  if (devUser) return { ...devUser, id: null, role: "admin", isDevelopmentUser: true };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) return null;
  const userId = claims?.sub;
  const email = claims?.email;
  if (typeof userId !== "string" || typeof email !== "string") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, phone_e164")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    email,
    phone: profile?.phone_e164 ?? (typeof claims.phone === "string" ? claims.phone : undefined),
    role: isAppRole(profile?.role) ? profile.role : "user",
    isDevelopmentUser: false,
  };
});
