import { redirect } from "next/navigation";
import { SuggestionQueue } from "@/components/admin/suggestion-queue";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function SuggestionsPage() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/admin/suggestions");
  if (user?.role !== "manager") redirect("/dashboard");
  return <SuggestionQueue adminView={false} />;
}
