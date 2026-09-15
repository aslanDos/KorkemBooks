import { cookies } from "next/headers";

const DEV_SESSION_COOKIE = "shambooks-dev-session";

function isEnabled() {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH_ENABLED === "true";
}

export function isValidDevCredentials(email: string, password: string) {
  return isEnabled() && email === process.env.DEV_AUTH_EMAIL?.toLowerCase() && password === process.env.DEV_AUTH_PASSWORD;
}

export async function createDevSession() {
  const token = process.env.DEV_AUTH_SESSION_TOKEN;
  if (!isEnabled() || !token) return;

  (await cookies()).set(DEV_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getDevUser() {
  const token = process.env.DEV_AUTH_SESSION_TOKEN;
  const session = (await cookies()).get(DEV_SESSION_COOKIE)?.value;
  if (!isEnabled() || !token || session !== token) return null;

  return { email: process.env.DEV_AUTH_EMAIL ?? "dev@shambooks.local" };
}

export async function deleteDevSession() {
  (await cookies()).delete(DEV_SESSION_COOKIE);
}
