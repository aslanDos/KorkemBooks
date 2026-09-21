import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BookPreviewGallery } from "@/components/books/book-preview-gallery";
import { getBookWithContent, getLastViewedQuestionId } from "@/lib/books/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function WriteBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string }> }) {
  const { bookId } = await params;
  const { question } = await searchParams;
  const [book, lastViewedQuestionId] = await Promise.all([getBookWithContent(bookId), getLastViewedQuestionId(bookId)]);
  if (!book) notFound();
  const firstQuestionId = book.chapters.flatMap((chapter) => chapter.questions)[0]?.id;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const admin = createSupabaseAdminClient();
  const { data: pendingSuggestions } = user && admin
    ? await admin.from("question_prompt_suggestions").select("question_id").eq("book_id", book.id).eq("owner_id", user.id).eq("language", book.language).eq("status", "pending")
    : { data: null };

  return (
    <>
      <header className="writer-page-header"><Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К структуре</Link><div><strong>{book.title}</strong></div></header>
      <BookPreviewGallery book={book} initialQuestionId={question ?? lastViewedQuestionId ?? firstQuestionId} pendingSuggestionIds={(pendingSuggestions ?? []).map((item) => item.question_id)} />
    </>
  );
}
