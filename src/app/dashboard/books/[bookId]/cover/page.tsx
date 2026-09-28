import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function BookCoverPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") notFound();
  redirect(`/admin/books/${bookId}/cover`);
}
