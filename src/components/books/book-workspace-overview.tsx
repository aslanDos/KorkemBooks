import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BookApprovalPanel } from "@/components/books/book-approval-panel";
import { BookStructureStats } from "@/components/books/book-structure-stats";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { SubmitBookButton } from "@/components/books/submit-book-button";
import { getBookLanguageLabel } from "@/lib/books/language";
import { getBookPageProgress } from "@/lib/books/progress";
import { BOOK_PRODUCTION_DESCRIPTIONS, BOOK_PRODUCTION_LABELS } from "@/lib/books/production-status";
import type { BookWithContent } from "@/lib/books/types";

export function BookWorkspaceOverview({ book }: { book: BookWithContent }) {
  const readOnly = book.productionStatus !== "writing";
  const questionCount = book.chapters.reduce((total, chapter) => total + chapter.questions.length, 0);
  const pageCount = getBookPageProgress(book).totalPages;

  return <>
    <section className="book-workspace-header">
      <Link href="/dashboard/books"><ArrowLeft size={17} />К библиотеке</Link>
      {readOnly ? <span className="book-readonly-badge">{BOOK_PRODUCTION_LABELS[book.productionStatus]} · только просмотр</span> : <SubmitBookButton bookId={book.id} progress={book.progress} />}
    </section>
    {readOnly && <section className="dashboard-section book-production-panel" aria-label="Этап книги"><span>Этап книги</span><strong>{BOOK_PRODUCTION_LABELS[book.productionStatus]}</strong><p>{BOOK_PRODUCTION_DESCRIPTIONS[book.productionStatus]}</p></section>}
    {book.productionStatus === "approval" && <BookApprovalPanel bookId={book.id} />}
    <section className="book-overview book-overview--summary" aria-label="Данные книги">
      <div className="book-summary-card book-summary-card--without-cover">
        <div className="book-summary-details">
          <h1>{book.title}</h1>
          <dl className="book-summary-people">
            <div><dt>Автор</dt><dd>{book.author_name}</dd></div>
            {book.recipient_name && <div><dt>Получатель</dt><dd>{book.recipient_name}</dd></div>}
            <div><dt>Язык книги</dt><dd>{getBookLanguageLabel(book.language)}</dd></div>
          </dl>
          {!readOnly && <EditBookDialog bookId={book.id} title={book.title} authorName={book.author_name} recipientName={book.recipient_name} />}
        </div>
      </div>
      <BookStructureStats key={`${book.chapters.length}:${questionCount}:${pageCount}`} chapterCount={book.chapters.length} questionCount={questionCount} pageCount={pageCount} progress={book.progress} showSubmissionHint={!readOnly} />
    </section>
  </>;
}
