"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Info, LayoutGrid, RectangleVertical } from "lucide-react";
import { RichAnswerText } from "@/components/books/rich-answer-editor";
import { BookPagePhoto } from "@/components/books/book-page-photo";
import { BookPhotoText, hasVisiblePhotoText } from "@/components/books/book-photo-text";
import { BookTitlePage } from "@/components/books/book-title-page";
import { BookChapterPage } from "@/components/books/book-chapter-page";
import { BookPrefacePage } from "@/components/books/book-preface-page";
import { BookPreviewSettings } from "@/components/books/book-preview-settings";
import { paginateBookAnswer } from "@/lib/books/pagination";
import type { AnswerFormat, BookBlankPage, BookChapter, BookPageImage, BookQuestion, BookWithContent } from "@/lib/books/types";
import { getPageBackgroundColor } from "@/lib/books/cover-palettes";
import { sliceAnswerFormat } from "@/lib/books/answer-format";
import { getBookFooterLabel } from "@/lib/books/page-footer";

type ContentsEntry = { id: string; title: string; chapterNumber: number; pageNumber: number | null };
type ReaderPage =
  | { kind: "opening-blank"; key: string; pageNumber: number }
  | { kind: "title"; key: string; pageNumber: number }
  | { kind: "preface"; key: string; pageNumber: number }
  | { kind: "contents"; key: string; pageNumber: number; contents: ContentsEntry[] }
  | { kind: "chapter"; key: string; pageNumber: number; chapter: BookChapter; chapterIndex: number }
  | { kind: "question"; key: string; pageNumber: number; chapter: BookChapter; question: BookQuestion; answerPart: string; answerPageFormat: AnswerFormat; answerPageIndex: number }
  | { kind: "photo"; key: string; pageNumber: number; chapter: BookChapter; question: BookQuestion; image: BookPageImage }
  | { kind: "blank"; key: string; pageNumber: number; chapter: BookChapter; question: BookQuestion; blankPage: BookBlankPage };

export function BookReaderPreview({ book, initialQuestionId }: { book: BookWithContent; initialQuestionId?: string }) {
  const [titlePageTitleSize, setTitlePageTitleSize] = useState(book.titlePageTitleSize);
  const [questionTextSize, setQuestionTextSize] = useState(book.questionTextSize);
  const [answerTextSize, setAnswerTextSize] = useState(book.answerTextSize);
  const pages = useMemo<ReaderPage[]>(() => {
    const visibleChapters = book.chapters
      .map((chapter) => ({ ...chapter, questions: chapter.questions.filter((question) => question.answer.trim() || question.images.length || question.blankPages.length) }))
      .filter((chapter) => chapter.questions.length > 0);
    const storyPages = visibleChapters.flatMap((chapter, chapterIndex) => [
      { kind: "chapter" as const, key: `chapter-${chapter.id}`, chapter, chapterIndex },
      ...chapter.questions.flatMap((question) => {
        let answerOffset = 0;
        const questionPages = (question.answer.trim() ? paginateBookAnswer(question.prompt, question.answer, { question: questionTextSize, answer: answerTextSize }) : []).map((answerPart, answerPageIndex) => {
          const answerPageFormat = sliceAnswerFormat(question.answerFormat, answerOffset, answerOffset + answerPart.length);
          const page = { kind: "question" as const, key: answerPageIndex === 0 ? `question-${question.id}` : `question-${question.id}-continuation-${answerPageIndex}`, chapter, question, answerPart, answerPageFormat, answerPageIndex };
          answerOffset += answerPart.length + 1;
          return page;
        });
        const attachmentPages = [
          ...question.images.map((image) => ({ kind: "photo" as const, key: `photo-${image.id}`, chapter, question, image, placement: image.placement, position: image.position })),
          ...question.blankPages.map((blankPage) => ({ kind: "blank" as const, key: `blank-${blankPage.id}`, chapter, question, blankPage, placement: blankPage.placement, position: blankPage.position })),
        ].sort((a, b) => a.position - b.position);
        return [...attachmentPages.filter((page) => page.placement === "before"), ...questionPages, ...attachmentPages.filter((page) => page.placement === "after")];
      }),
    ]).map((page, index) => ({ ...page, pageNumber: index + 5 }));

    const contents = visibleChapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title,
      chapterNumber: index + 1,
      pageNumber: storyPages.find((page) => page.kind === "chapter" && page.chapter.id === chapter.id)?.pageNumber ?? null,
    }));

    return [
      { kind: "opening-blank", key: "opening-blank", pageNumber: 1 },
      { kind: "title", key: "title", pageNumber: 2 },
      { kind: "preface", key: "preface", pageNumber: 3 },
      { kind: "contents", key: "contents", pageNumber: 4, contents },
      ...storyPages,
    ];
  }, [book.chapters, questionTextSize, answerTextSize]);

  const initialIndex = initialQuestionId ? pages.findIndex((page) => page.kind === "question" && page.question.id === initialQuestionId) : 0;
  const [mode, setMode] = useState<"single" | "all">("single");
  const [chapterPageStyle, setChapterPageStyle] = useState(book.chapterPageStyle);
  const [chapterTitleSize, setChapterTitleSize] = useState(book.chapterTitleSize);
  const [showFooterAuthor, setShowFooterAuthor] = useState(book.showFooterAuthor);
  const [showFooterTitle, setShowFooterTitle] = useState(book.showFooterTitle);
  const [pageBackground, setPageBackground] = useState(book.pageBackground);
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const active = pages[activeIndex] ?? pages[0];
  const spreads = useMemo(() => Array.from({ length: Math.ceil(pages.length / 2) }, (_, index) => pages.slice(index * 2, index * 2 + 2)), [pages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateScale = () => {
      if (mode === "single") {
        setScale(Math.min(.86, Math.max(.2, (viewport.clientWidth - 32) / 400)));
        return;
      }
      const twoColumns = viewport.clientWidth >= 980;
      const availableWidth = twoColumns ? (viewport.clientWidth - 66) / 2 : viewport.clientWidth - 32;
      setScale(Math.min(twoColumns ? .62 : .78, Math.max(.2, availableWidth / 800)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [mode]);

  return (
    <section className="book-reader" aria-label="Предпросмотр книги">
      <header className="book-reader__toolbar">
        <div><BookOpen size={19} /><span><strong>Предпросмотр книги</strong><small>{pages.length} страниц</small></span></div>
        <div className="book-reader__modes" role="group" aria-label="Режим отображения">
          <button type="button" className={mode === "single" ? "is-active" : ""} aria-pressed={mode === "single"} onClick={() => setMode("single")}><RectangleVertical size={16} />Одна страница</button>
          <button type="button" className={mode === "all" ? "is-active" : ""} aria-pressed={mode === "all"} onClick={() => setMode("all")}><LayoutGrid size={16} />Все страницы</button>
        </div>
      </header>
      <div className="book-reader__notice">
        <Info size={17} aria-hidden="true" />
        <p><strong>Здесь отображаются только заполненные истории.</strong><span>Вопросы без ответа не показываются в предпросмотре и не войдут в книгу.</span></p>
      </div>
      <BookPreviewSettings bookId={book.id} titlePageTitleSize={titlePageTitleSize} chapterStyle={chapterPageStyle} chapterTitleSize={chapterTitleSize} questionTextSize={questionTextSize} answerTextSize={answerTextSize} showFooterAuthor={showFooterAuthor} showFooterTitle={showFooterTitle} pageBackground={pageBackground} sampleTitle={book.chapters[0]?.title ?? "Название главы"} disabled={book.productionStatus !== "writing"} onTitlePageTitleSizeChange={(size) => {
        setTitlePageTitleSize(size);
        const titlePageIndex = pages.findIndex((page) => page.kind === "title");
        if (titlePageIndex >= 0) setActiveIndex(titlePageIndex);
      }} onChapterStyleChange={(style) => {
        setChapterPageStyle(style);
        const firstChapterIndex = pages.findIndex((page) => page.kind === "chapter");
        if (firstChapterIndex >= 0) setActiveIndex(firstChapterIndex);
      }} onChapterTitleSizeChange={(size) => {
        setChapterTitleSize(size);
        const firstChapterIndex = pages.findIndex((page) => page.kind === "chapter");
        if (firstChapterIndex >= 0) setActiveIndex(firstChapterIndex);
      }} onQuestionTextSizeChange={(size) => {
        setQuestionTextSize(size);
        const firstQuestionIndex = pages.findIndex((page) => page.kind === "question");
        if (firstQuestionIndex >= 0) setActiveIndex(firstQuestionIndex);
      }} onAnswerTextSizeChange={(size) => {
        setAnswerTextSize(size);
        const firstQuestionIndex = pages.findIndex((page) => page.kind === "question");
        if (firstQuestionIndex >= 0) setActiveIndex(firstQuestionIndex);
      }} onFooterAuthorChange={setShowFooterAuthor} onFooterTitleChange={setShowFooterTitle} onPageBackgroundChange={(background) => {
        setPageBackground(background);
        const firstBackgroundPageIndex = pages.findIndex((page) => page.kind === "photo" || page.kind === "blank");
        if (firstBackgroundPageIndex >= 0) setActiveIndex(firstBackgroundPageIndex);
      }} />

      {mode === "single" ? <>
        <div className="book-reader__stage" ref={viewportRef}>
          <div className="book-spread-paper book-spread-paper--single" style={{ zoom: scale }}>
            <ReaderLeaf page={active} book={book} titlePageTitleSize={titlePageTitleSize} chapterPageStyle={chapterPageStyle} chapterTitleSize={chapterTitleSize} questionTextSize={questionTextSize} answerTextSize={answerTextSize} showFooterAuthor={showFooterAuthor} showFooterTitle={showFooterTitle} pageBackground={pageBackground} />
          </div>
        </div>
        <nav className="book-reader__pagination" aria-label="Перелистывание страниц">
          <div>
            <button type="button" aria-label="Предыдущая страница" disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}><ChevronLeft size={20} /></button>
            <span aria-live="polite" aria-label={`Страница ${active.pageNumber} из ${pages.length}`}><strong>{active.pageNumber}</strong>/{pages.length}</span>
            <button type="button" aria-label="Следующая страница" disabled={activeIndex === pages.length - 1} onClick={() => setActiveIndex((index) => Math.min(pages.length - 1, index + 1))}><ChevronRight size={20} /></button>
          </div>
          <label><span>Страница</span><select value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))} aria-label="Перейти к странице">{pages.map((page, index) => <option key={page.key} value={index}>{page.pageNumber}</option>)}</select></label>
        </nav>
      </> : <div className="book-reader__all" ref={viewportRef}>
        {spreads.map((spread) => <figure className="book-reader__spread" key={spread[0].key}>
          <div className="book-spread-paper" style={{ zoom: scale }}>
            {spread.map((page) => <ReaderLeaf key={page.key} page={page} book={book} titlePageTitleSize={titlePageTitleSize} chapterPageStyle={chapterPageStyle} chapterTitleSize={chapterTitleSize} questionTextSize={questionTextSize} answerTextSize={answerTextSize} showFooterAuthor={showFooterAuthor} showFooterTitle={showFooterTitle} pageBackground={pageBackground} />)}
            {spread.length === 1 && <div className="book-spread-leaf book-spread-blank" aria-label="Пустая страница" />}
          </div>
          <figcaption>{spread.map((page) => page.pageNumber).join("–")}</figcaption>
        </figure>)}
      </div>}
    </section>
  );
}

function ReaderLeaf({ page, book, titlePageTitleSize, chapterPageStyle, chapterTitleSize, questionTextSize, answerTextSize, showFooterAuthor, showFooterTitle, pageBackground }: { page: ReaderPage; book: BookWithContent; titlePageTitleSize: BookWithContent["titlePageTitleSize"]; chapterPageStyle: BookWithContent["chapterPageStyle"]; chapterTitleSize: BookWithContent["chapterTitleSize"]; questionTextSize: BookWithContent["questionTextSize"]; answerTextSize: BookWithContent["answerTextSize"]; showFooterAuthor: boolean; showFooterTitle: boolean; pageBackground: BookWithContent["pageBackground"] }) {
  return <div className="book-spread-leaf">
    <div className={`preview-page preview-page--font-${book.pageFont} preview-page--question-size-${questionTextSize} preview-page--answer-size-${answerTextSize}${page.kind === "photo" ? " preview-page--photo" : ""}${page.kind === "title" ? " preview-page--title" : ""}${page.kind === "chapter" ? " preview-page--chapter" : ""}`}>
      <ReaderPageContent page={page} book={book} titlePageTitleSize={titlePageTitleSize} chapterPageStyle={chapterPageStyle} chapterTitleSize={chapterTitleSize} pageBackground={pageBackground} />
      {page.kind !== "opening-blank" && page.kind !== "title" && page.kind !== "preface" && page.kind !== "contents" && page.kind !== "chapter" && page.kind !== "blank" && !(page.kind === "photo" && page.image.hideFooter) && <footer className="preview-page__footer"><p className="preview-page__chapter">{getBookFooterLabel({ pageNumber: page.pageNumber, authorName: book.author_name, bookTitle: book.title, showAuthor: showFooterAuthor, showTitle: showFooterTitle })}</p><span className="preview-page__number">{page.pageNumber}</span></footer>}
    </div>
  </div>;
}

function ReaderPageContent({ page, book, titlePageTitleSize, chapterPageStyle, chapterTitleSize, pageBackground }: { page: ReaderPage; book: BookWithContent; titlePageTitleSize: BookWithContent["titlePageTitleSize"]; chapterPageStyle: BookWithContent["chapterPageStyle"]; chapterTitleSize: BookWithContent["chapterTitleSize"]; pageBackground: BookWithContent["pageBackground"] }) {
  if (page.kind === "opening-blank") return <div className="preview-opening-blank" aria-label="Первая пустая страница" />;
  if (page.kind === "title") return <BookTitlePage authorName={book.author_name} title={book.title} titleSize={titlePageTitleSize} />;
  if (page.kind === "preface") return <BookPrefacePage />;
  if (page.kind === "contents") return <div className="preview-contents-page"><h2>Содержание</h2><ol>{page.contents.map((entry) => <li key={entry.id}><span className="preview-contents-page__chapter-number">{String(entry.chapterNumber).padStart(2, "0")}</span><span className="preview-contents-page__title">{entry.title}</span><i aria-hidden="true" /><b>{entry.pageNumber ?? "—"}</b></li>)}</ol></div>;
  if (page.kind === "chapter") return <BookChapterPage chapterNumber={page.chapterIndex + 1} title={page.chapter.title} style={chapterPageStyle} titleSize={chapterTitleSize} background={pageBackground} />;
  if (page.kind === "photo") return <div className={`preview-photo-page preview-photo-page--${page.image.displayMode}${pageBackground !== "white" ? " preview-page-background--colored" : ""}${page.image.roundedCorners ? " preview-photo-page--rounded" : ""}${page.image.displayMode === "contain" && hasVisiblePhotoText(page.image.photoText) && page.image.photoText.placement === "below" ? " preview-photo-page--text-below" : ""}`} style={{ background: getPageBackgroundColor(pageBackground) }}><BookPagePhoto image={page.image} pageNumber={page.pageNumber} /><BookPhotoText settings={page.image.photoText} displayMode={page.image.displayMode} /></div>;
  if (page.kind === "blank") return <div className={`preview-blank-page${pageBackground !== "white" ? " preview-page-background--colored" : ""}`} style={{ background: getPageBackgroundColor(pageBackground) }} aria-label={`Пустая страница ${page.pageNumber}`} />;
  return <div className="preview-page__content"><div className="preview-page__body">{page.answerPageIndex === 0 && <p className="preview-page__question">{page.question.prompt}</p>}{page.answerPart.trim() && <p className="preview-page__answer"><RichAnswerText text={page.answerPart} format={page.answerPageFormat} /></p>}</div></div>;
}
