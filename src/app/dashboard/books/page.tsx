import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookCard } from "@/components/books/book-card";
import { getBooks } from "@/lib/books/queries";

export default async function BooksPage() {
  const books = await getBooks();

  return (
    <>
      <DashboardHeader title="Мои книги" description="Все ваши истории в одном месте" />
      <section className="dashboard-section books-section">
        <div className="section-heading"><div><h2>Библиотека</h2><p>{books.length} {books.length === 1 ? "книга" : "книг"}</p></div>{books.length === 0 && <Link className="content-primary-button" href="/dashboard/books/new"><Plus size={18} />Создать книгу</Link>}</div>
        {books.length === 0 ? <div className="empty-books empty-books--large"><BookOpenText size={30} /><h3>Создайте свою первую книгу</h3><p>Отвечайте на подготовленные вопросы и постепенно соберите историю.</p><Link href="/dashboard/books/new">Начать создание</Link></div> : <div className="book-grid book-grid--library">{books.map((book) => <BookCard book={book} key={book.id} />)}</div>}
      </section>
    </>
  );
}
