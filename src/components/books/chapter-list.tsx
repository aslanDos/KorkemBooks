import { ChevronDown } from "lucide-react";
import { ChapterControls } from "@/components/books/chapter-controls";
import { ChapterQuestions } from "@/components/books/chapter-questions";
import type { BookChapter } from "@/lib/books/types";

export function ChapterList({ bookId, chapters }: { bookId: string; chapters: BookChapter[] }) {
  return (
    <section className="chapter-list">
      {chapters.map((chapter, index) => {
        const questionOffset = chapters.slice(0, index).reduce((total, item) => total + item.questions.length, 0);
        const answeredCount = chapter.questions.filter((question) => question.answer.trim()).length;
        return (
        <details className="chapter-card" key={chapter.id} open={index === 0}>
          <summary>
            <span className="chapter-card__identity"><b aria-label={`Отвечено вопросов: ${answeredCount}`}>{answeredCount}</b><span><small>Глава {index + 1}</small><strong>{chapter.title}</strong></span></span>
            <span className="chapter-card__actions"><ChapterControls bookId={bookId} chapterId={chapter.id} title={chapter.title} /><span>{chapter.questions.length} вопросов</span><ChevronDown className="chapter-card__chevron" size={18} /></span>
          </summary>
          <ChapterQuestions key={chapter.questions.map((question) => `${question.id}:${question.position}:${question.prompt}`).join("|")} bookId={bookId} questions={chapter.questions} questionOffset={questionOffset} />
        </details>
      );})}
    </section>
  );
}
