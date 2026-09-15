import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookCard } from "@/components/books/book-card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBooks } from "@/lib/books/queries";

export default async function DashboardPage() {
  const [user, books] = await Promise.all([getCurrentUser(), getBooks()]);

  return (
    <>
      <DashboardHeader title="Добро пожаловать" description={user?.displayName ? `Продолжите создавать историю, ${user.displayName}` : "Продолжите создавать свою историю"} />
      <section className={`overview-grid${books.length <= 1 ? " overview-grid--single" : ""}`}>
        <article className="overview-hero">
          <div><p className="eyebrow">{books.length > 0 ? "Продолжите историю" : "Начните с воспоминания"}</p><h2>{books.length > 0 ? "Ваша книга ждёт продолжения" : "Ваша первая книга ждёт"}</h2><p>Отвечайте на простые вопросы, а korkembooks поможет собрать ответы в связную историю.</p></div>
          <Link className="content-primary-button" href={books[0] ? `/dashboard/books/${books[0].id}` : "/dashboard/books/new"}>{books.length > 0 ? "Продолжить" : <><Plus size={18} />Создать книгу</>}</Link>
        </article>
        {books.length > 1 && <article className="overview-stat"><span><BookOpenText size={21} /></span><div><strong>{books.length}</strong><p>Книг в библиотеке</p></div></article>}
      </section>
      <section className="dashboard-section">
        <div className="section-heading"><div><h2>Недавние книги</h2><p>Здесь появятся книги, над которыми вы работаете.</p></div><Link href="/dashboard/books">Все книги</Link></div>
        {books.length === 0 ? <div className="empty-books"><BookOpenText size={28} /><h3>Пока нет ни одной книги</h3><p>Создайте первую книгу — мы проведём вас по каждому шагу.</p></div> : <div className="book-grid book-grid--recent">{books.slice(0, 3).map((book) => <BookCard book={book} key={book.id} />)}</div>}
      </section>
    </>
  );
}
