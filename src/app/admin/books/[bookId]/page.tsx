import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, Download, Palette, Truck } from "lucide-react";
import { AdminAnswerForm } from "@/components/admin/admin-answer-form";
import { BookStatusSelect } from "@/components/admin/book-status-select";
import { BookCoverThumbnail } from "@/components/books/book-cover-thumbnail";
import { BookStructureStats } from "@/components/books/book-structure-stats";
import { getBookPageProgress } from "@/lib/books/progress";
import { BookPrintStats } from "@/components/books/book-print-stats";
import { getBookPrintLayout } from "@/lib/books/print-layout";
import { getAdminBookWithContent } from "@/lib/books/queries";
import { getAdminBookDelivery } from "@/lib/admin/book-delivery";
import { BookDeliveryForm } from "@/components/admin/book-delivery-form";
import { BookLanguageSelect } from "@/components/admin/book-language-select";
import { getBookLanguageLabel } from "@/lib/books/language";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SendBookForApproval } from "@/components/admin/send-book-for-approval";
import { BookFinancePanel } from "@/components/admin/book-finance-panel";
import { getBookFinance, todayInAlmaty } from "@/lib/admin/finance";
import { DeleteBookButton } from "@/components/admin/delete-book-button";

export default async function AdminBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getAdminBookWithContent(bookId);
  if (!book) notFound();
  const [delivery, financial] = await Promise.all([getAdminBookDelivery(bookId), getBookFinance(bookId)]);
  const admin = createSupabaseAdminClient();
  const { data: latestApproval } = admin
    ? await admin.from("book_approval_requests").select("status, feedback, requested_at, decided_at").eq("book_id", bookId).order("requested_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const questions = book.chapters.flatMap(chapter => chapter.questions);
  const answered = questions.filter(question => question.answer.trim()).length;
  const pageCount = getBookPageProgress(book).totalPages;
  const answeredChapters = book.chapters.map((chapter, index) => ({
    chapter,
    number: index + 1,
    questions: chapter.questions.filter((question) => question.answer.trim()),
  })).filter(({ questions: answeredQuestions }) => answeredQuestions.length > 0);
  const printLayout = getBookPrintLayout(book);

  return <div className="admin-book-workspace">
    <header className="book-workspace-header">
      <Link href="/admin/books"><ArrowLeft size={17} />Все книги</Link>
      <div className="book-workspace-header__controls"><BookLanguageSelect key={book.language} bookId={book.id} language={book.language} disabled={book.productionStatus !== "writing" && book.productionStatus !== "editing"} /><BookStatusSelect bookId={book.id} status={book.productionStatus} /><DeleteBookButton bookId={book.id} title={book.title} /></div>
    </header>
    {book.productionStatus === "editing" && <section className="admin-card book-approval-admin"><h2>Согласование макета</h2>{latestApproval?.status === "changes_requested" && latestApproval.feedback && <p className="book-approval-feedback"><strong>Пользователь попросил исправить:</strong> {latestApproval.feedback}</p>}<SendBookForApproval bookId={book.id} /></section>}
    {book.productionStatus === "approval" && <section className="admin-card book-approval-admin"><h2>Ожидаем решение пользователя</h2><p>Макет и ответы заблокированы от изменений до подтверждения или запроса правок.</p></section>}
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
      <BookStructureStats key={`${book.chapters.length}:${questions.length}:${pageCount}`} chapterCount={book.chapters.length} questionCount={questions.length} pageCount={pageCount} progress={book.progress} />
    </section>
    <BookPrintStats layout={printLayout} />
    <BookFinancePanel key={`${book.id}:${financial.finance?.price ?? "unset"}:${financial.finance?.entries.map((entry) => `${entry.id}:${entry.voidedAt}`).join(",")}`} bookId={book.id} finance={financial.finance} today={todayInAlmaty()} loadError={financial.error} />
    <div className="chapter-heading" id="book-delivery-heading">
      <div><Truck size={20} aria-hidden="true" /><span><h2>Доставка</h2><small>Укажите, как передать готовую книгу.</small></span></div>
    </div>
    <BookDeliveryForm key={JSON.stringify(delivery)} bookId={book.id} delivery={delivery.delivery} loadError={delivery.error} />
    <div className="chapter-heading">
      <div><BookOpen size={20} aria-hidden="true" /><span><h2>Главы и ответы</h2><small>Изменения администратора сохраняются в книге пользователя.</small></span></div>
      <nav className="chapter-heading__actions" aria-label="Действия с книгой">
        <Link className="secondary-content-button" href={`/admin/books/${book.id}/cover`}><Palette size={16} />Обложка</Link>
        {["printing", "ready", "delivery", "received"].includes(book.productionStatus) && <Link className="secondary-content-button" href={`/admin/books/${book.id}/print`} target="_blank" rel="noopener noreferrer"><Download size={16} />Скачать PDF</Link>}
      </nav>
    </div>
    <section className="admin-book-content">
      {answeredChapters.map(({ chapter, number, questions: answeredQuestions }, chapterIndex) => <details className="admin-chapter" key={chapter.id} open={chapterIndex === 0}>
        <summary><span aria-label="Ответов в главе">{answeredQuestions.length}</span><div><small>Глава {number}</small><h3>{chapter.title}</h3></div><small className="admin-chapter-count">{answeredQuestions.length} ответов</small><ChevronDown size={18} aria-hidden="true" /></summary>
        <div>{answeredQuestions.map(question => <AdminAnswerForm key={`${question.id}:${question.answer}`} bookId={book.id} questionId={question.id} prompt={question.prompt} answer={question.answer} readOnly={book.productionStatus !== "writing" && book.productionStatus !== "editing"} />)}</div>
      </details>)}
      {answeredChapters.length === 0 && <p className="admin-book-empty">В этой книге пока нет ответов. Они появятся здесь, когда пользователь начнёт писать.</p>}
    </section>
  </div>;
}
