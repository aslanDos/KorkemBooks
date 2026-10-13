import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, History, LayoutDashboard, Palette, Truck, WalletCards } from "lucide-react";
import { BookStatusSelect } from "@/components/admin/book-status-select";
import { BookStructureStats } from "@/components/books/book-structure-stats";
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
import { PrintFormatButton } from "@/components/admin/print-format-button";
import { BookStatusHistory } from "@/components/admin/book-status-history";
import { getAdminBookStatusHistory } from "@/lib/admin/book-status-history";
import { getBookGenderLabel } from "@/lib/books/personalization";
import { formatPhone } from "@/lib/auth/phone";

type AdminBookTab = "overview" | "finance" | "delivery" | "history" | "content";

export default async function AdminBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams?: Promise<{ tab?: string }> }) {
  const { bookId } = await params;
  const requestedTab = (await searchParams)?.tab;
  const activeTab: AdminBookTab = requestedTab === "finance" || requestedTab === "delivery" || requestedTab === "history" || requestedTab === "content" ? requestedTab : "overview";
  const contentMode = activeTab === "overview" ? "summary" : activeTab === "content" ? "structure" : "metadata";
  const book = await getAdminBookWithContent(bookId, contentMode);
  if (!book) notFound();
  const [delivery, financial, statusHistory] = await Promise.all([
    activeTab === "delivery" ? getAdminBookDelivery(bookId) : Promise.resolve(null),
    activeTab === "finance" ? getBookFinance(bookId) : Promise.resolve(null),
    activeTab === "history" ? getAdminBookStatusHistory(bookId) : Promise.resolve(null),
  ]);
  const admin = activeTab === "overview" ? createSupabaseAdminClient() : null;
  const [{ data: latestApproval }, { data: ownerData }] = admin
    ? await Promise.all([
      admin.from("book_approval_requests").select("status, feedback, requested_at, decided_at").eq("book_id", bookId).order("requested_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("books").select("profiles!books_owner_id_fkey(phone_e164)").eq("id", bookId).maybeSingle(),
    ])
    : [{ data: null }, { data: null }];
  const ownerProfile = ownerData ? (Array.isArray(ownerData.profiles) ? ownerData.profiles[0] : ownerData.profiles) : null;
  const ownerPhone = ownerProfile?.phone_e164 ?? null;
  const questions = activeTab === "overview" || activeTab === "content" ? book.chapters.flatMap(chapter => chapter.questions) : [];
  const answered = questions.filter(question => question.answer.trim()).length;
  const answeredChapters = activeTab === "content" ? book.chapters.map((chapter, index) => ({
    chapter,
    number: index + 1,
    questions: chapter.questions.filter((question) => question.answer.trim()),
  })).filter(({ questions: answeredQuestions }) => answeredQuestions.length > 0) : [];
  const bookHref = `/admin/books/${book.id}`;

  return <div className="admin-book-workspace">
    <header className="book-workspace-header">
      <Link href="/admin/books"><ArrowLeft size={17} />Все книги</Link>
      <div className="book-workspace-header__controls"><BookLanguageSelect key={book.language} bookId={book.id} language={book.language} disabled={book.productionStatus !== "writing" && book.productionStatus !== "editing"} /><BookStatusSelect bookId={book.id} status={book.productionStatus} /><PrintFormatButton bookId={book.id} /><DeleteBookButton bookId={book.id} title={book.title} /></div>
    </header>
    <nav className="admin-book-section-tabs" aria-label="Разделы книги">
      <Link href={bookHref} className={activeTab === "overview" ? "is-active" : ""} aria-current={activeTab === "overview" ? "page" : undefined}><LayoutDashboard size={16} />Обзор</Link>
      <Link href={`${bookHref}?tab=finance`} className={activeTab === "finance" ? "is-active" : ""} aria-current={activeTab === "finance" ? "page" : undefined}><WalletCards size={16} />Финансы</Link>
      <Link href={`${bookHref}?tab=delivery`} className={activeTab === "delivery" ? "is-active" : ""} aria-current={activeTab === "delivery" ? "page" : undefined}><Truck size={16} />Доставка</Link>
      <Link href={`${bookHref}?tab=history`} className={activeTab === "history" ? "is-active" : ""} aria-current={activeTab === "history" ? "page" : undefined}><History size={16} />История статусов</Link>
      <Link href={`${bookHref}?tab=content`} className={activeTab === "content" ? "is-active" : ""} aria-current={activeTab === "content" ? "page" : undefined}><BookOpen size={16} />Главы и ответы</Link>
    </nav>
    {activeTab === "overview" && <>
    {book.productionStatus === "editing" && <section className="admin-card book-approval-admin"><h2>Согласование макета</h2>{latestApproval?.status === "changes_requested" && latestApproval.feedback && <p className="book-approval-feedback"><strong>Пользователь попросил исправить:</strong> {latestApproval.feedback}</p>}<SendBookForApproval bookId={book.id} /></section>}
    {book.productionStatus === "approval" && <section className="admin-card book-approval-admin"><h2>Ожидаем решение пользователя</h2><p>Макет и ответы заблокированы от изменений до подтверждения или запроса правок.</p></section>}
    <section className="book-overview book-overview--summary" aria-label="Данные книги">
      <div className="book-summary-card book-summary-card--without-cover">
        <div className="book-summary-details">
          <h1>{book.title}</h1>
          <div className="admin-book-client-contact"><span>Телефон клиента</span>{ownerPhone ? <a href={`https://wa.me/${ownerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="Открыть чат в WhatsApp">{formatPhone(ownerPhone)}</a> : <strong>Не указан</strong>}</div>
          <div className="book-summary-columns">
            <dl className="book-summary-people">
              {book.recipient_name && <div><dt>Получатель</dt><dd>{book.recipient_name}</dd></div>}
              <div><dt>Автор</dt><dd>{book.author_name}</dd></div>
              <div><dt>Язык</dt><dd>{getBookLanguageLabel(book.language)}</dd></div>
            </dl>
            <dl className="book-summary-people">
              <div><dt>Тип получателя</dt><dd>{book.typeName}</dd></div>
              <div><dt>Обращение к автору</dt><dd>{getBookGenderLabel(book.authorGender)}</dd></div>
              <div><dt>Обращение к получателю</dt><dd>{getBookGenderLabel(book.recipientGender)}</dd></div>
            </dl>
          </div>
          <div className="admin-book-back-cover-text"><strong>Послание на задней стороне</strong><p>{book.backCoverText || "Не добавлено"}</p></div>
          <div className="admin-book-metadata"><span>Ответы: <b>{answered} из {questions.length}</b></span><span>Обновлена: <time dateTime={book.updated_at}>{new Date(book.updated_at).toLocaleDateString("ru-KZ")}</time></span></div>
        </div>
      </div>
      <BookStructureStats key={`${book.chapters.length}:${questions.length}`} chapterCount={book.chapters.length} questionCount={questions.length} pageCount={0} progress={book.progress} showPageCount={false} />
    </section>
    </>}
    {activeTab === "finance" && financial && <BookFinancePanel key={`${book.id}:${financial.finance?.price ?? "unset"}:${financial.finance?.entries.map((entry) => `${entry.id}:${entry.voidedAt}`).join(",")}`} bookId={book.id} finance={financial.finance} today={todayInAlmaty()} loadError={financial.error} />}
    {activeTab === "delivery" && delivery && <BookDeliveryForm key={JSON.stringify(delivery)} bookId={book.id} delivery={delivery.delivery} loadError={delivery.error} />}
    {activeTab === "history" && statusHistory && <BookStatusHistory entries={statusHistory.entries} loadError={statusHistory.error} />}
    {activeTab === "content" && <>
    <div className="chapter-heading">
      <div><BookOpen size={20} aria-hidden="true" /><span><h2>Главы и ответы</h2><small>Ответы пользователя доступны только для просмотра.</small></span></div>
      <nav className="chapter-heading__actions" aria-label="Действия с книгой">
        <Link className="secondary-content-button" href={`/admin/books/${book.id}/cover`}><Palette size={16} />Обложка</Link>
      </nav>
    </div>
    <section className="admin-book-content">
      {answeredChapters.map(({ chapter, number, questions: answeredQuestions }, chapterIndex) => <details className="admin-chapter" key={chapter.id} open={chapterIndex === 0}>
        <summary><span aria-label="Ответов в главе">{answeredQuestions.length}</span><div><small>Глава {number}</small><h3>{chapter.title}</h3></div><small className="admin-chapter-count">{answeredQuestions.length} ответов</small><ChevronDown size={18} aria-hidden="true" /></summary>
        <div>{answeredQuestions.map(question => <article className="admin-answer-form" key={`${question.id}:${question.answer}`}><div className="admin-answer-form__heading"><div><h4>{question.prompt}</h4>{question.promptEditedByOwner && <span className="admin-answer-form__owner-edit">Изменено пользователем</span>}</div></div><p className="admin-answer-form__answer">{question.answer}</p></article>)}</div>
      </details>)}
      {answeredChapters.length === 0 && <p className="admin-book-empty">В этой книге пока нет ответов. Они появятся здесь, когда пользователь начнёт писать.</p>}
    </section>
    </>}
  </div>;
}
