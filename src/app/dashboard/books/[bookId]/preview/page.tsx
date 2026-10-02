import { notFound } from "next/navigation";
import { BookReaderPreview } from "@/components/books/book-reader-preview";
import { BookSettingsPanel } from "@/components/books/book-settings-panel";
import { BookViewTabs } from "@/components/books/book-view-tabs";
import { BookWorkspaceOverview } from "@/components/books/book-workspace-overview";
import { getBookWithContent } from "@/lib/books/queries";
import type { BookPreviewSettingsGroup } from "@/components/books/book-preview-settings";

export default async function PreviewBookPage({ params, searchParams }: { params: Promise<{ bookId: string }>; searchParams: Promise<{ question?: string; page?: string; settings?: string }> }) {
  const { bookId } = await params;
  const { question, page, settings } = await searchParams;
  const initialSettingsGroup: BookPreviewSettingsGroup | undefined = settings === "title" || settings === "chapter" || settings === "page" ? settings : undefined;
  const book = await getBookWithContent(bookId);
  if (!book) notFound();
  const readOnly = book.productionStatus !== "writing";

  return <>
    <BookWorkspaceOverview book={book} />
    <BookViewTabs bookId={book.id} active="preview" />
    <BookSettingsPanel key={initialSettingsGroup ?? "closed"} initialOpenGroup={initialSettingsGroup} bookId={book.id} bookLanguage={book.language} initialTitlePageTitleSize={book.titlePageTitleSize} initialChapterStyle={book.chapterPageStyle} initialChapterTitleSize={book.chapterTitleSize} initialQuestionTextSize={book.questionTextSize} initialAnswerTextSize={book.answerTextSize} initialShowFooterAuthor={book.showFooterAuthor} initialShowFooterTitle={book.showFooterTitle} initialRoundPhotos={book.roundPhotos} initialPageBackground={book.pageBackground} sampleTitle={book.chapters[0]?.title ?? "Название главы"} disabled={readOnly} />
    <BookReaderPreview book={book} initialQuestionId={question} initialPageKey={page} />
  </>;
}
