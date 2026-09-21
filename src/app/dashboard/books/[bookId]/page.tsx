import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, ListChecks, Palette } from "lucide-react";
import { getBookWithContent, getLastViewedQuestionId } from "@/lib/books/queries";
import { BookCoverThumbnail } from "@/components/books/book-cover-thumbnail";
import { EditBookDialog } from "@/components/books/edit-book-dialog";
import { ChapterList } from "@/components/books/chapter-list";
import { BookStructureStats } from "@/components/books/book-structure-stats";
import { SubmitBookButton } from "@/components/books/submit-book-button";
import { getBookLanguageLabel } from "@/lib/books/language";

export default async function BookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const [book, lastViewedQuestionId] = await Promise.all([getBookWithContent(bookId, "structure"), getLastViewedQuestionId(bookId)]);
  if (!book) notFound();

  const hasLegacyQuestions = book.chapters.some(chapter => chapter.questions.some(question => question.catalogId === null));
  const questionCount = book.chapters.reduce((total, chapter) => total + chapter.questions.length, 0);
  const readOnly = book.productionStatus !== "writing";
  const questions = book.chapters.flatMap((chapter) => chapter.questions);
  const resumeQuestion = questions.find((question) => question.id === lastViewedQuestionId) ?? questions[0];
  const resumeChapter = resumeQuestion ? book.chapters.find((chapter) => chapter.questions.some((question) => question.id === resumeQuestion.id)) : null;

  return (
    <>
      <section className="book-workspace-header">
        <Link href="/dashboard/books"><ArrowLeft size={17} />К библиотеке</Link>
        {readOnly ? <span className="book-readonly-badge">На редактуре · только просмотр</span> : <SubmitBookButton bookId={book.id} progress={book.progress} />}
      </section>
      <section className="book-overview book-overview--summary" aria-label="Данные книги">
        <div className="book-summary-card">
          <Link className="book-summary-cover" href={`/dashboard/books/${book.id}/cover`} aria-label="Посмотреть обложку книги">
            <BookCoverThumbnail book={book} />
          </Link>
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
        <BookStructureStats key={`${book.chapters.length}:${questionCount}`} chapterCount={book.chapters.length} questionCount={questionCount} progress={book.progress} />
      </section>
      {resumeQuestion && <Link className="book-resume-card" href={`/dashboard/books/${book.id}/write?question=${resumeQuestion.id}`}>
        <span className="book-resume-card__copy"><small>{lastViewedQuestionId ? "Продолжить заполнение" : "Начать заполнение"}</small><p>{resumeQuestion.prompt}</p>{resumeChapter && <em>{resumeChapter.title}</em>}</span>
        <span className="book-resume-card__action">Продолжить <ArrowRight size={17} aria-hidden="true" /></span>
      </Link>}
      <div className="chapter-heading"><div><ListChecks size={20} /><span><strong>Вопросы</strong><small>{readOnly ? "Книга передана редактору" : "Нажмите на вопрос, чтобы открыть его в редакторе"}</small></span></div><div className="chapter-heading__actions"><Link className="secondary-content-button" href={`/dashboard/books/${book.id}/preview`}><Eye size={16} />Предпросмотр</Link><Link className="secondary-content-button" href={`/dashboard/books/${book.id}/cover`}><Palette size={16} />{readOnly ? "Посмотреть обложку" : "Обложка"}</Link></div></div>
      {hasLegacyQuestions && <p className="question-pool-note">В этой книге сохранены вопросы из прежнего шаблона и ваши ответы. Новый набор доступен в нераспределённых вопросах. Текст прежних вопросов также нельзя изменять.</p>}
      {readOnly ? <div className="readonly-structure">{book.chapters.map((chapter, index) => { const offset = book.chapters.slice(0, index).reduce((total, item) => total + item.questions.length, 0); return <section key={chapter.id}><header><span>{chapter.questions.filter(question => question.answer.trim()).length}</span><strong>{chapter.title}</strong></header><ol>{chapter.questions.map((question, questionIndex) => <li key={question.id}>{String(offset + questionIndex + 1).padStart(2, "0")}. {question.prompt}</li>)}</ol></section>; })}</div> : <>{book.chapters.length === 0 ? <div className="dashboard-section"><p>Создайте главу, затем выберите для неё вопросы.</p></div> : <ChapterList key={book.chapters.map((chapter) => `${chapter.id}:${chapter.position}:${chapter.title}:${chapter.questions.map((question) => question.id).join(",")}`).join("|")} bookId={book.id} chapters={book.chapters} />}</>}
    </>
  );
}
