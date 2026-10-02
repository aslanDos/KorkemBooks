import { notFound } from "next/navigation";
import { PrintBookButton } from "@/components/admin/print-book-button";
import { PrintBookSheet } from "@/components/books/print-book-sheet";
import { getAdminBookWithContent } from "@/lib/books/queries";
import { getBookPrintLayout } from "@/lib/books/print-layout";
import { BookPrintStats } from "@/components/books/book-print-stats";
import { RichAnswerText } from "@/components/books/rich-answer-editor";
import { BookPagePhoto } from "@/components/books/book-page-photo";
import { BookPhotoText } from "@/components/books/book-photo-text";
import { BookTitlePage } from "@/components/books/book-title-page";
import { BookChapterPage } from "@/components/books/book-chapter-page";
import { BookPrefacePage } from "@/components/books/book-preface-page";
import { getPageBackgroundColor } from "@/lib/books/cover-palettes";
import { getBookFooterLabel } from "@/lib/books/page-footer";
import { getBookContent } from "@/lib/books/language";

export default async function PrintBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams?: Promise<{ format?: string }> }) {
  const { bookId } = await params;
  const format = (await searchParams)?.format === "compact" ? "compact" : "a5";
  const isCompact = format === "compact";
  const book = await getAdminBookWithContent(bookId);
  if (!book) notFound();

  const printLayout = getBookPrintLayout(book, format);
  const content = getBookContent(book.language);
  const { storyPages } = printLayout;

  const contents = book.chapters.map((chapter, index) => ({
    id: chapter.id,
    number: index + 1,
    title: chapter.title,
    pageNumber: storyPages.find(page => page.kind === "chapter" && page.chapter.id === chapter.id)?.pageNumber ?? null,
  }));

  return <div className={`print-book-workspace${isCompact ? " print-book-workspace--compact" : ""}`}>
    <section className="print-book-toolbar" aria-label="Настройки печати">
      <div><h1>Печать книги</h1><p>{isCompact ? "PDF: 139 × 209 мм, включая вылеты по 2 мм. После обрезки — 135 × 205 мм." : "PDF: 152 × 214 мм, включая вылеты по 2 мм. После обрезки — A5 (148 × 210 мм)."} Сохраняйте без полей, с фоном, в масштабе 100% и без системных колонтитулов.</p></div>
      <PrintBookButton />
      <BookPrintStats layout={printLayout} />
    </section>
    <div className="print-book-stage"><div className="print-book">
    <PrintBookSheet pageNumber={1} className={`preview-page--title preview-page--font-${book.pageFont}`}>
      <BookTitlePage authorName={book.author_name} title={book.title} titleSize={book.titlePageTitleSize} />
    </PrintBookSheet>
    <PrintBookSheet pageNumber={2} className={`preview-page--font-${book.pageFont}`}>
      <BookPrefacePage language={book.language} />
    </PrintBookSheet>
    <PrintBookSheet pageNumber={3} className={`preview-page--font-${book.pageFont}`}>
      <div className="preview-contents-page"><h2>{content.contents}</h2><ol>{contents.map(entry => <li key={entry.id}><span className="preview-contents-page__heading"><span className="preview-contents-page__chapter-number">{String(entry.number).padStart(2, "0")}</span><span className="preview-contents-page__title">{entry.title}</span></span><i aria-hidden="true" /><b>{entry.pageNumber ?? "—"}</b></li>)}</ol></div>
    </PrintBookSheet>
    {storyPages.map(page => <PrintBookSheet pageNumber={page.pdfPageNumber} printMode={page.kind === "question" ? "monochrome" : "color"} className={`preview-page--font-${book.pageFont} preview-page--question-size-${book.questionTextSize} preview-page--answer-size-${book.answerTextSize}${page.kind === "photo" ? " preview-page--photo" : ""}${page.kind === "chapter" ? " preview-page--chapter" : ""}`} background={page.kind === "question" ? "#FFFFFF" : getPageBackgroundColor(book.pageBackground)} key={page.key}>
      {page.kind === "chapter" ? <BookChapterPage chapterNumber={page.chapterIndex + 1} title={page.chapter.title} style={book.chapterPageStyle} titleSize={book.chapterTitleSize} background={book.pageBackground} language={book.language} /> : page.kind === "question" ? <div className="preview-page__content"><div className="preview-page__body">{page.answerPageIndex === 0 && <p className="preview-page__question">{page.question.prompt}</p>}{page.answerPart.trim() && <p className="preview-page__answer"><RichAnswerText text={page.answerPart} format={page.answerPageFormat} /></p>}</div></div> : page.kind === "photo" ? <div className={`preview-photo-page preview-photo-page--${page.image.displayMode} preview-page-background--colored${book.roundPhotos ? " preview-photo-page--rounded" : ""}`} style={{ background: getPageBackgroundColor(book.pageBackground) }}><BookPagePhoto image={{ ...page.image, roundedCorners: book.roundPhotos }} pageNumber={page.pageNumber} /><BookPhotoText settings={page.image.photoText} /></div> : <div className="preview-blank-page preview-page-background--colored" style={{ background: getPageBackgroundColor(book.pageBackground) }} aria-label={`Пустая страница ${page.pageNumber}`} />}
      {page.kind !== "chapter" && page.kind !== "blank" && !(page.kind === "photo" && page.image.hideFooter) && <PageFooter pageNumber={page.pageNumber} bookTitle={book.title} authorName={book.author_name} showAuthor={book.showFooterAuthor} showTitle={book.showFooterTitle} />}
    </PrintBookSheet>)}
    </div></div>
  </div>;
}

function PageFooter({ pageNumber, bookTitle, authorName, showAuthor, showTitle }: { pageNumber: number; bookTitle: string; authorName: string; showAuthor: boolean; showTitle: boolean }) {
  return <footer className="preview-page__footer"><p className="preview-page__chapter">{getBookFooterLabel({ pageNumber, authorName, bookTitle, showAuthor, showTitle })}</p><span className="preview-page__number">{pageNumber}</span></footer>;
}
