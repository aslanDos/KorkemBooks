import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SuggestionReviewForm } from "@/components/admin/suggestion-review-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBookLanguageLabel } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

export async function SuggestionQueue({ adminView }: { adminView: boolean }) {
  const admin = createSupabaseAdminClient();
  const { data: suggestions, error } = admin
    ? await admin.from("question_prompt_suggestions")
      .select("id, book_id, language, original_prompt, suggested_prompt, created_at, books(title, language)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
    : { data: null, error: new Error("Supabase не настроен") };

  return <>
    <DashboardHeader title="Исправления вопросов" description="Предложения пользователей для отдельных книг" />
    {error && <p role="alert" className="admin-form-error">Не удалось загрузить предложения. Попробуйте обновить страницу.</p>}
    {!error && suggestions?.length === 0 && <section className="admin-card question-suggestions-empty"><h2>Новых предложений нет</h2><p>Когда пользователь предложит исправление вопроса, оно появится здесь.</p></section>}
    <div className="question-suggestions-list">{suggestions?.map((suggestion) => {
      const book = Array.isArray(suggestion.books) ? suggestion.books[0] : suggestion.books;
      return <article className="admin-card question-suggestion-card" key={suggestion.id}>
        <header><div><small>{getBookLanguageLabel(suggestion.language as BookLanguage)} · {new Date(suggestion.created_at).toLocaleDateString("ru-KZ")}</small><h2>{book?.title ?? "Книга"}</h2></div>{adminView && <Link href={`/admin/books/${suggestion.book_id}`}>Открыть книгу</Link>}</header>
        {book && book.language !== suggestion.language && <p className="question-suggestion-card__notice">Язык книги уже изменён. Исправление сохранится для языка предложения и появится, если книгу снова переключат на него.</p>}
        <div className="question-suggestion-card__texts"><div><span>Сейчас в книге</span><p>{suggestion.original_prompt}</p></div><div><span>Предложение пользователя</span><p>{suggestion.suggested_prompt}</p></div></div>
        <SuggestionReviewForm id={suggestion.id} suggestedPrompt={suggestion.suggested_prompt} />
      </article>;
    })}</div>
  </>;
}
