"use client";

import { useState } from "react";
import { BookPreviewSettings, type BookPreviewSettingsGroup } from "@/components/books/book-preview-settings";
import type { BookAnswerTextSize, BookChapterPageStyle, BookChapterTitleSize, BookLanguage, BookPageBackground, BookQuestionTextSize, BookTitlePageTitleSize } from "@/lib/books/types";

export function BookSettingsPanel({ initialOpenGroup, bookId, bookLanguage, initialTitlePageTitleSize, initialChapterStyle, initialChapterTitleSize, initialQuestionTextSize, initialAnswerTextSize, initialShowFooterAuthor, initialShowFooterTitle, initialRoundPhotos, initialPageBackground, sampleTitle, disabled }: {
  initialOpenGroup?: BookPreviewSettingsGroup;
  bookId: string;
  bookLanguage: BookLanguage;
  initialTitlePageTitleSize: BookTitlePageTitleSize;
  initialChapterStyle: BookChapterPageStyle;
  initialChapterTitleSize: BookChapterTitleSize;
  initialQuestionTextSize: BookQuestionTextSize;
  initialAnswerTextSize: BookAnswerTextSize;
  initialShowFooterAuthor: boolean;
  initialShowFooterTitle: boolean;
  initialRoundPhotos: boolean;
  initialPageBackground: BookPageBackground;
  sampleTitle: string;
  disabled: boolean;
}) {
  const [titlePageTitleSize, setTitlePageTitleSize] = useState(initialTitlePageTitleSize);
  const [chapterStyle, setChapterStyle] = useState(initialChapterStyle);
  const [chapterTitleSize, setChapterTitleSize] = useState(initialChapterTitleSize);
  const [questionTextSize, setQuestionTextSize] = useState(initialQuestionTextSize);
  const [answerTextSize, setAnswerTextSize] = useState(initialAnswerTextSize);
  const [showFooterAuthor, setShowFooterAuthor] = useState(initialShowFooterAuthor);
  const [showFooterTitle, setShowFooterTitle] = useState(initialShowFooterTitle);
  const [roundPhotos, setRoundPhotos] = useState(initialRoundPhotos);
  const [pageBackground, setPageBackground] = useState(initialPageBackground);

  return <BookPreviewSettings
    initialOpenGroup={initialOpenGroup}
    bookId={bookId}
    bookLanguage={bookLanguage}
    titlePageTitleSize={titlePageTitleSize}
    chapterStyle={chapterStyle}
    chapterTitleSize={chapterTitleSize}
    questionTextSize={questionTextSize}
    answerTextSize={answerTextSize}
    showFooterAuthor={showFooterAuthor}
    showFooterTitle={showFooterTitle}
    roundPhotos={roundPhotos}
    pageBackground={pageBackground}
    sampleTitle={sampleTitle}
    disabled={disabled}
    onTitlePageTitleSizeChange={setTitlePageTitleSize}
    onChapterStyleChange={setChapterStyle}
    onChapterTitleSizeChange={setChapterTitleSize}
    onQuestionTextSizeChange={setQuestionTextSize}
    onAnswerTextSizeChange={setAnswerTextSize}
    onFooterAuthorChange={setShowFooterAuthor}
    onFooterTitleChange={setShowFooterTitle}
    onRoundPhotosChange={setRoundPhotos}
    onPageBackgroundChange={setPageBackground}
  />;
}
