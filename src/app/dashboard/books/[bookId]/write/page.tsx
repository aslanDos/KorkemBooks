import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookPreviewGallery } from "@/components/books/book-preview-gallery";
import { getBookWithContent, getLastViewedQuestionId } from "@/lib/books/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function WriteBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string }> }) {
  const { bookId } = await params;
  const { question } = await searchParams;
  const [book, lastViewedQuestionId, user] = await Promise.all([getBookWithContent(bookId), getLastViewedQuestionId(bookId), getCurrentUser()]);
  if (!book) notFound();
  if (book.productionStatus !== "writing") redirect(`/dashboard/books/${book.id}/preview${question ? `?question=${encodeURIComponent(question)}` : ""}`);
  const firstQuestionId = book.chapters.flatMap((chapter) => chapter.questions)[0]?.id;
  const admin = createSupabaseAdminClient();
  const { data: suggestions } = user?.id && admin
    ? await admin.from("question_prompt_suggestions").select("question_id, status, review_comment").eq("book_id", book.id).eq("owner_id", user.id).eq("language", book.language).order("created_at", { ascending: false })
    : { data: null };

  return (
    <>
      <header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К структуре</Link><div><strong>{book.title}</strong></div></header>
      <BookPreviewGallery book={book} initialQuestionId={question ?? lastViewedQuestionId ?? firstQuestionId} questionSuggestions={Object.fromEntries((suggestions ?? []).map((item) => [item.question_id, item]).reverse())} />
    </>
  );
}
