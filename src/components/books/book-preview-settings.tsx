"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { saveBookFooterVisibilityAction, saveBookPageBackgroundAction, saveBookPageTextSizeAction, saveBookTitlePageTitleSizeAction, saveChapterPageStyleAction, saveChapterTitleSizeAction } from "@/app/dashboard/books/preview-actions";
import { BookChapterPage } from "@/components/books/book-chapter-page";
import { PAGE_BACKGROUND_OPTIONS } from "@/lib/books/cover-palettes";
import { BOOK_ANSWER_TEXT_SIZES, BOOK_CHAPTER_TITLE_SIZES, BOOK_QUESTION_TEXT_SIZES, BOOK_TITLE_PAGE_TITLE_SIZES, type BookAnswerTextSize, type BookChapterPageStyle, type BookChapterTitleSize, type BookPageBackground, type BookQuestionTextSize, type BookTitlePageTitleSize } from "@/lib/books/types";

const STYLE_OPTIONS: Array<{ value: BookChapterPageStyle; label: string; description: string }> = [
  { value: "default", label: "По умолчанию", description: "Спокойная центрированная композиция" },
  { value: "numeral", label: "Крупный номер", description: "Номер главы становится частью фона" },
  { value: "vertical", label: "Вертикальная", description: "Название смещено к вертикальной оси" },
];

export function BookPreviewSettings({ bookId, titlePageTitleSize, chapterStyle, chapterTitleSize, questionTextSize, answerTextSize, showFooterAuthor, showFooterTitle, pageBackground, sampleTitle, disabled, onTitlePageTitleSizeChange, onChapterStyleChange, onChapterTitleSizeChange, onQuestionTextSizeChange, onAnswerTextSizeChange, onFooterAuthorChange, onFooterTitleChange, onPageBackgroundChange }: { bookId: string; titlePageTitleSize: BookTitlePageTitleSize; chapterStyle: BookChapterPageStyle; chapterTitleSize: BookChapterTitleSize; questionTextSize: BookQuestionTextSize; answerTextSize: BookAnswerTextSize; showFooterAuthor: boolean; showFooterTitle: boolean; pageBackground: BookPageBackground; sampleTitle: string; disabled: boolean; onTitlePageTitleSizeChange: (size: BookTitlePageTitleSize) => void; onChapterStyleChange: (style: BookChapterPageStyle) => void; onChapterTitleSizeChange: (size: BookChapterTitleSize) => void; onQuestionTextSizeChange: (size: BookQuestionTextSize) => void; onAnswerTextSizeChange: (size: BookAnswerTextSize) => void; onFooterAuthorChange: (visible: boolean) => void; onFooterTitleChange: (visible: boolean) => void; onPageBackgroundChange: (background: BookPageBackground) => void }) {
  const [titlePageStatus, setTitlePageStatus] = useState("");
  const [chapterStatus, setChapterStatus] = useState("");
  const [pageStatus, setPageStatus] = useState("");
  const [isTitlePagePending, startTitlePageTransition] = useTransition();
  const [isChapterPending, startChapterTransition] = useTransition();
  const [isPagePending, startPageTransition] = useTransition();
  const selectedLabel = STYLE_OPTIONS.find((option) => option.value === chapterStyle)?.label ?? STYLE_OPTIONS[0].label;

  function selectTitlePageTitleSize(size: BookTitlePageTitleSize) {
    if (disabled || isTitlePagePending || size === titlePageTitleSize) return;
    const previous = titlePageTitleSize;
    onTitlePageTitleSizeChange(size);
    setTitlePageStatus("Сохраняется…");
    startTitlePageTransition(async () => {
      const result = await saveBookTitlePageTitleSizeAction({ bookId, size });
      if (result.error) {
        onTitlePageTitleSizeChange(previous);
        setTitlePageStatus(result.error);
        return;
      }
      setTitlePageStatus("Сохранено");
    });
  }

  function selectStyle(style: BookChapterPageStyle) {
    if (disabled || isChapterPending || style === chapterStyle) return;
    const previous = chapterStyle;
    onChapterStyleChange(style);
    setChapterStatus("Сохраняется…");
    startChapterTransition(async () => {
      const result = await saveChapterPageStyleAction({ bookId, style });
      if (result.error) {
        onChapterStyleChange(previous);
        setChapterStatus(result.error);
        return;
      }
      setChapterStatus("Сохранено");
    });
  }

  function selectTitleSize(size: BookChapterTitleSize) {
    if (disabled || isChapterPending || size === chapterTitleSize) return;
    const previous = chapterTitleSize;
    onChapterTitleSizeChange(size);
    setChapterStatus("Сохраняется…");
    startChapterTransition(async () => {
      const result = await saveChapterTitleSizeAction({ bookId, size });
      if (result.error) {
        onChapterTitleSizeChange(previous);
        setChapterStatus(result.error);
        return;
      }
      setChapterStatus("Сохранено");
    });
  }

  function selectBackground(background: BookPageBackground) {
    if (disabled || isPagePending || background === pageBackground) return;
    const previous = pageBackground;
    onPageBackgroundChange(background);
    setPageStatus("Сохраняется…");
    startPageTransition(async () => {
      const result = await saveBookPageBackgroundAction({ bookId, background });
      if (result.error) {
        onPageBackgroundChange(previous);
        setPageStatus(result.error);
        return;
      }
      setPageStatus("Сохранено");
    });
  }

  function selectQuestionTextSize(size: BookQuestionTextSize) {
    if (disabled || isPagePending || size === questionTextSize) return;
    const previous = questionTextSize;
    onQuestionTextSizeChange(size);
    setPageStatus("Сохраняется…");
    startPageTransition(async () => {
      const result = await saveBookPageTextSizeAction({ bookId, target: "question", size });
      if (result.error) {
        onQuestionTextSizeChange(previous);
        setPageStatus(result.error);
        return;
      }
      setPageStatus("Сохранено");
    });
  }

  function selectAnswerTextSize(size: BookAnswerTextSize) {
    if (disabled || isPagePending || size === answerTextSize) return;
    const previous = answerTextSize;
    onAnswerTextSizeChange(size);
    setPageStatus("Сохраняется…");
    startPageTransition(async () => {
      const result = await saveBookPageTextSizeAction({ bookId, target: "answer", size });
      if (result.error) {
        onAnswerTextSizeChange(previous);
        setPageStatus(result.error);
        return;
      }
      setPageStatus("Сохранено");
    });
  }

  function selectFooterVisibility(target: "author" | "title", visible: boolean) {
    if (disabled || isPagePending) return;
    const previous = target === "author" ? showFooterAuthor : showFooterTitle;
    const onChange = target === "author" ? onFooterAuthorChange : onFooterTitleChange;
    onChange(visible);
    setPageStatus("Сохраняется…");
    startPageTransition(async () => {
      const result = await saveBookFooterVisibilityAction({ bookId, target, visible });
      if (result.error) {
        onChange(previous);
        setPageStatus(result.error);
        return;
      }
      setPageStatus("Сохранено");
    });
  }

  return (
    <details className="book-preview-settings">
      <summary>
        <Settings2 size={18} aria-hidden="true" />
        <span><strong>Настройки книги</strong><small>Оформление страниц и разделов</small></span>
        <ChevronDown className="book-preview-settings__chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="book-preview-settings__body">
        <details className="book-preview-settings__group" open>
          <summary>
            <span><strong>Оформление титульной страницы</strong><small>Размер названия книги</small></span>
            <ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="book-preview-settings__group-body" aria-busy={isTitlePagePending}>
            <p>Выберите размер названия книги на титульной странице.</p>
            <fieldset className="book-size-options">
              <legend>Размер названия книги</legend>
              <div>
                {BOOK_TITLE_PAGE_TITLE_SIZES.map((size) => <button key={size} type="button" className={titlePageTitleSize === size ? "is-selected" : ""} aria-pressed={titlePageTitleSize === size} disabled={disabled || isTitlePagePending} onClick={() => selectTitlePageTitleSize(size)}>{size}</button>)}
              </div>
            </fieldset>
            <div className="book-preview-settings__status"><span aria-live="polite">{titlePageStatus}</span>{disabled && <small>Настройки недоступны после отправки книги на редактуру.</small>}</div>
          </div>
        </details>
        <details className="book-preview-settings__group" open>
          <summary>
            <span><strong>Оформление глав</strong><small>{selectedLabel}</small></span>
            <ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="book-preview-settings__group-body" aria-busy={isChapterPending}>
            <p>Выберите вступительную страницу, которая будет открывать каждую главу.</p>
            <div className="book-chapter-style-grid" role="group" aria-label="Вариант оформления глав">
              {STYLE_OPTIONS.map((option) => <button key={option.value} type="button" className={chapterStyle === option.value ? "is-selected" : ""} aria-pressed={chapterStyle === option.value} disabled={disabled || isChapterPending} onClick={() => selectStyle(option.value)}>
                <span className="book-chapter-style-card__preview" aria-hidden="true"><span><BookChapterPage chapterNumber={1} title={sampleTitle} style={option.value} titleSize={chapterTitleSize} background={pageBackground} /></span></span>
                <span className="book-chapter-style-card__copy"><strong>{option.label}</strong><small>{option.description}</small></span>
              </button>)}
            </div>
            <fieldset className="book-size-options">
              <legend>Размер заголовка главы</legend>
              <div>
                {BOOK_CHAPTER_TITLE_SIZES.map((size) => <button key={size} type="button" className={chapterTitleSize === size ? "is-selected" : ""} aria-pressed={chapterTitleSize === size} disabled={disabled || isChapterPending} onClick={() => selectTitleSize(size)}>{size}</button>)}
              </div>
            </fieldset>
            <div className="book-preview-settings__status"><span aria-live="polite">{chapterStatus}</span>{disabled && <small>Настройки недоступны после отправки книги на редактуру.</small>}</div>
          </div>
        </details>
        <details className="book-preview-settings__group">
          <summary>
            <span><strong>Оформление страниц</strong><small>Текст и фон</small></span>
            <ChevronDown className="book-preview-settings__chevron" size={17} aria-hidden="true" />
          </summary>
          <div className="book-preview-settings__group-body" aria-busy={isPagePending}>
            <p>Настройте размер текста вопроса и ответа, основной фон и нижний колонтитул страниц книги.</p>
            <fieldset className="book-size-options">
              <legend>Размер текста вопроса</legend>
              <div>
                {BOOK_QUESTION_TEXT_SIZES.map((size) => <button key={size} type="button" className={questionTextSize === size ? "is-selected" : ""} aria-pressed={questionTextSize === size} disabled={disabled || isPagePending} onClick={() => selectQuestionTextSize(size)}>{size}</button>)}
              </div>
            </fieldset>
            <fieldset className="book-size-options">
              <legend>Размер текста ответа</legend>
              <div>
                {BOOK_ANSWER_TEXT_SIZES.map((size) => <button key={size} type="button" className={answerTextSize === size ? "is-selected" : ""} aria-pressed={answerTextSize === size} disabled={disabled || isPagePending} onClick={() => selectAnswerTextSize(size)}>{size}</button>)}
              </div>
            </fieldset>
            <fieldset className="book-page-background-options">
              <legend>Основной цвет фона</legend>
              <div className="book-page-background-grid">
                {PAGE_BACKGROUND_OPTIONS.map((option) => <button key={option.key} type="button" className={pageBackground === option.key ? "is-selected" : ""} aria-label={option.name} title={option.name} aria-pressed={pageBackground === option.key} disabled={disabled || isPagePending} style={{ background: option.background }} onClick={() => selectBackground(option.key)} />)}
              </div>
            </fieldset>
            <fieldset className="book-footer-options">
              <legend>Нижний колонтитул</legend>
              <p>Если включён только один элемент, он будет отображаться на всех страницах с колонтитулом.</p>
              <div className="book-footer-option">
                <span><strong>Имя автора</strong><small>Показывать автора внизу страницы</small></span>
                <button className="book-footer-toggle" type="button" role="switch" aria-label="Показывать имя автора в колонтитуле" aria-checked={showFooterAuthor} disabled={disabled || isPagePending} onClick={() => selectFooterVisibility("author", !showFooterAuthor)}><span /></button>
              </div>
              <div className="book-footer-option">
                <span><strong>Название книги</strong><small>Показывать название внизу страницы</small></span>
                <button className="book-footer-toggle" type="button" role="switch" aria-label="Показывать название книги в колонтитуле" aria-checked={showFooterTitle} disabled={disabled || isPagePending} onClick={() => selectFooterVisibility("title", !showFooterTitle)}><span /></button>
              </div>
            </fieldset>
            <div className="book-preview-settings__status"><span aria-live="polite">{pageStatus}</span>{disabled && <small>Настройки недоступны после отправки книги на редактуру.</small>}</div>
          </div>
        </details>
      </div>
    </details>
  );
}
