import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBookLanguageLabel } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

const statusLabels: Record<string, string> = {
  pending: "На рассмотрении",
  approved: "Принято",
  rejected: "Отклонено",
};

export default async function MySuggestionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login");

  const admin = createSupabaseAdminClient();
  const { data: suggestions, error } = admin
    ? await admin.from("question_prompt_suggestions")
      .select("id, book_id, question_id, language, original_prompt, suggested_prompt, resolved_prompt, review_comment, status, created_at, reviewed_at, books(title, deleted_at)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
    : { data: null, error: new Error("Supabase не настроен") };

  return <>
    <DashboardHeader title="Мои исправления" description="Предложения по формулировкам вопросов и решения команды" />
    {error && <p role="alert" className="admin-form-error">Не удалось загрузить исправления. Попробуйте обновить страницу.</p>}
    {!error && suggestions?.length === 0 && <section className="admin-card question-suggestions-empty"><h2>Предложений пока нет</h2><p>Если в книге встретится неточный вопрос, предложите исправление прямо в редакторе.</p></section>}
    <div className="question-suggestions-list">{suggestions?.map((suggestion) => {
      const book = Array.isArray(suggestion.books) ? suggestion.books[0] : suggestion.books;
      return <article className="admin-card question-suggestion-card" key={suggestion.id}>
        <header><div><small>{book?.title ?? "Книга"} · {getBookLanguageLabel(suggestion.language as BookLanguage)} · {new Date(suggestion.created_at).toLocaleDateString("ru-KZ")}</small><h2><span className={`question-suggestion-status question-suggestion-status--${suggestion.status}`}>{statusLabels[suggestion.status] ?? suggestion.status}</span></h2></div>{book && !book.deleted_at && <Link href={`/dashboard/books/${suggestion.book_id}/write?question=${suggestion.question_id}`}>Открыть вопрос</Link>}</header>
        <div className="question-suggestion-card__texts"><div><span>Исходный вопрос</span><p>{suggestion.original_prompt}</p></div><div><span>Ваше предложение</span><p>{suggestion.suggested_prompt}</p></div></div>
        {suggestion.status === "approved" && suggestion.resolved_prompt && <p className="question-suggestion-card__notice"><strong>Итоговая формулировка:</strong> {suggestion.resolved_prompt}</p>}
        {suggestion.review_comment && <p className="question-suggestion-card__notice"><strong>Комментарий команды:</strong> {suggestion.review_comment}</p>}
      </article>;
    })}</div>
  </>;
}
