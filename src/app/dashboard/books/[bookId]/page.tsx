import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ListChecks } from "lucide-react";
import { getBookWithContent, getLastViewedQuestionId } from "@/lib/books/queries";
import { ChapterList } from "@/components/books/chapter-list";
import { BookViewTabs } from "@/components/books/book-view-tabs";
import { BookWorkspaceOverview } from "@/components/books/book-workspace-overview";

export default async function BookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ answered?: string }> }) {
  const { bookId } = await params;
  const { answered } = await searchParams;
  const answeredOnly = answered === "1";
  const [book, lastViewedQuestionId] = await Promise.all([getBookWithContent(bookId, "summary"), getLastViewedQuestionId(bookId)]);
  if (!book) notFound();

  const hasLegacyQuestions = book.chapters.some(chapter => chapter.questions.some(question => question.catalogId === null));
  const readOnly = book.productionStatus !== "writing";
  const questions = book.chapters.flatMap((chapter) => chapter.questions);
  const questionNumbers = Object.fromEntries(questions.map((question, index) => [question.id, index + 1]));
  const visibleChapters = answeredOnly
    ? book.chapters.map((chapter) => ({ ...chapter, questions: chapter.questions.filter((question) => question.answer.trim()) }))
    : book.chapters;
  const resumeQuestion = questions.find((question) => question.id === lastViewedQuestionId) ?? questions[0];
  const resumeChapter = resumeQuestion ? book.chapters.find((chapter) => chapter.questions.some((question) => question.id === resumeQuestion.id)) : null;

  return (
    <>
      <BookWorkspaceOverview book={book} />
      <BookViewTabs bookId={book.id} active="questions" />
      {!readOnly && resumeQuestion && <Link className="book-resume-card" href={`/dashboard/books/${book.id}/write?question=${resumeQuestion.id}`}>
        <span className="book-resume-card__copy"><small>{lastViewedQuestionId ? "Продолжить заполнение" : "Начать заполнение"}</small><p>{resumeQuestion.prompt}</p>{resumeChapter && <em>{resumeChapter.title}</em>}</span>
        <span className="book-resume-card__action">Продолжить <ArrowRight size={17} aria-hidden="true" /></span>
      </Link>}
      <div className="chapter-heading"><div><ListChecks size={20} /><span><strong>Вопросы</strong><small>{readOnly ? "Книга передана редактору" : "Нажмите на вопрос, чтобы открыть его в редакторе"}</small></span></div><div className="chapter-heading__actions"><Link className={`answered-question-toggle${answeredOnly ? " is-active" : ""}`} href={answeredOnly ? `/dashboard/books/${book.id}` : `/dashboard/books/${book.id}?answered=1`} role="switch" aria-checked={answeredOnly}><span aria-hidden="true"><i /></span>Только с ответами</Link></div></div>
      {hasLegacyQuestions && <p className="question-pool-note">В этой книге сохранены вопросы из прежнего шаблона и ваши ответы. Новый набор доступен в нераспределённых вопросах. Текст прежних вопросов также нельзя изменять.</p>}
      {book.chapters.length === 0 ? <div className="dashboard-section"><p>Создайте главу, затем выберите для неё вопросы.</p></div> : <ChapterList key={`${readOnly}:${answeredOnly}:${book.chapters.map((chapter) => `${chapter.id}:${chapter.position}:${chapter.title}:${chapter.questions.map((question) => question.id).join(",")}`).join("|")}`} bookId={book.id} chapters={visibleChapters} questionNumbers={questionNumbers} answeredOnly={answeredOnly} readOnly={readOnly} />}
    </>
  );
}
