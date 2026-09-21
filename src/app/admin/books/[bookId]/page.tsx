import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, Download, Palette } from "lucide-react";
import { AdminAnswerForm } from "@/components/admin/admin-answer-form";
import { BookStatusSelect } from "@/components/admin/book-status-select";
import { BookCoverThumbnail } from "@/components/books/book-cover-thumbnail";
import { BookStructureStats } from "@/components/books/book-structure-stats";
import { BookPrintStats } from "@/components/books/book-print-stats";
import { getBookPrintLayout } from "@/lib/books/print-layout";
import { getAdminBookWithContent } from "@/lib/books/queries";
import { getAdminBookDelivery } from "@/lib/admin/book-delivery";
import { BookDeliveryForm } from "@/components/admin/book-delivery-form";
import { BookLanguageSelect } from "@/components/admin/book-language-select";
import { getBookLanguageLabel } from "@/lib/books/language";

export default async function AdminBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getAdminBookWithContent(bookId);
  if (!book) notFound();
  const delivery = await getAdminBookDelivery(bookId);
  const questions = book.chapters.flatMap(chapter => chapter.questions);
  const answered = questions.filter(question => question.answer.trim()).length;
  const printLayout = getBookPrintLayout(book);

  return <div className="admin-book-workspace">
    <header className="book-workspace-header">
      <Link href="/admin/books"><ArrowLeft size={17} />Все книги</Link>
      <div className="book-workspace-header__controls"><BookLanguageSelect key={book.language} bookId={book.id} language={book.language} /><BookStatusSelect bookId={book.id} status={book.productionStatus} /></div>
    </header>
    <section className="book-overview book-overview--summary" aria-label="Данные книги">
      <div className="book-summary-card">
        <Link className="book-summary-cover" href={`/admin/books/${book.id}/cover`} aria-label="Редактировать обложку книги">
          <BookCoverThumbnail book={book} />
        </Link>
        <div className="book-summary-details">
          <h1>{book.title}</h1>
          <dl className="book-summary-people">
            <div><dt>Автор</dt><dd>{book.author_name}</dd></div>
            {book.recipient_name && <div><dt>Получатель</dt><dd>{book.recipient_name}</dd></div>}
            <div><dt>Тип получателя</dt><dd>{book.typeName}</dd></div>
            <div><dt>Язык</dt><dd>{getBookLanguageLabel(book.language)}</dd></div>
          </dl>
          <div className="admin-book-metadata"><span>Ответы: <b>{answered} из {questions.length}</b></span><span>Обновлена: <time dateTime={book.updated_at}>{new Date(book.updated_at).toLocaleDateString("ru-KZ")}</time></span></div>
        </div>
      </div>
      <BookStructureStats key={`${book.chapters.length}:${questions.length}`} chapterCount={book.chapters.length} questionCount={questions.length} progress={book.progress} />
    </section>
    <BookPrintStats layout={printLayout} />
    <BookDeliveryForm key={JSON.stringify(delivery)} bookId={book.id} delivery={delivery.delivery} loadError={delivery.error} />
    <div className="chapter-heading">
      <div><BookOpen size={20} aria-hidden="true" /><span><h2>Главы и ответы</h2><small>Изменения администратора сохраняются в книге пользователя.</small></span></div>
      <nav className="chapter-heading__actions" aria-label="Действия с книгой">
        <Link className="secondary-content-button" href={`/admin/books/${book.id}/cover`}><Palette size={16} />Обложка</Link>
        <Link className="secondary-content-button" href={`/admin/books/${book.id}/print`} target="_blank" rel="noopener noreferrer"><Download size={16} />Скачать PDF</Link>
      </nav>
    </div>
    <section className="admin-book-content">
      {book.chapters.map((chapter, chapterIndex) => <details className="admin-chapter" key={chapter.id} open={chapterIndex === 0}>
        <summary><span aria-label="Ответов в главе">{chapter.questions.filter(question => question.answer.trim()).length}</span><div><small>Глава {chapterIndex + 1}</small><h3>{chapter.title}</h3></div><small className="admin-chapter-count">{chapter.questions.length} вопросов</small><ChevronDown size={18} aria-hidden="true" /></summary>
        <div>{chapter.questions.map(question => <AdminAnswerForm key={question.id} bookId={book.id} questionId={question.id} prompt={question.prompt} answer={question.answer} />)}</div>
      </details>)}
      {book.chapters.length === 0 && <p className="admin-book-empty">В этой книге пока нет глав.</p>}
    </section>
  </div>;
}
