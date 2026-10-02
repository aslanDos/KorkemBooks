import Link from "next/link";
import { Check, FilePlus2, ImageIcon, Quote } from "lucide-react";
import type { BookQuestion } from "@/lib/books/types";

export function ChapterQuestions({ bookId, questions, questionOffset, questionNumbers, answeredOnly = false, readOnly = false }: {
  bookId: string; questions: BookQuestion[]; questionOffset: number; questionNumbers?: Record<string, number>; answeredOnly?: boolean; readOnly?: boolean;
}) {
  return <>
    <ol>{questions.map((question, index) => {
      const answer = question.answer.trim().replace(/\s+/g, " ");
      const photoPageCount = question.images.length;
      const blankPageCount = question.blankPages.length;
      const textPageCount = question.textPages.length;
      const className = `chapter-question-link${answer ? " chapter-question-link--answered" : ""}${readOnly ? " chapter-question-link--readonly" : ""}`;
      const content = <>
        <span>{String(questionNumbers?.[question.id] ?? questionOffset + index + 1).padStart(2, "0")}</span>
        <div className="chapter-question-copy"><p>{question.prompt}</p>{answer && <span className="chapter-question-answer" title={answer}>{answer}</span>}</div>
        {(photoPageCount > 0 || blankPageCount > 0 || textPageCount > 0 || answer) && <div className="chapter-question-indicators">
          {photoPageCount > 0 && <span className="chapter-question-attachment" title={`Фотостраниц: ${photoPageCount}`} aria-label={`Фотостраниц: ${photoPageCount}`}><ImageIcon size={15} />{photoPageCount > 1 && <small>{photoPageCount}</small>}</span>}
          {blankPageCount > 0 && <span className="chapter-question-attachment" title={`Пустых страниц: ${blankPageCount}`} aria-label={`Пустых страниц: ${blankPageCount}`}><FilePlus2 size={15} />{blankPageCount > 1 && <small>{blankPageCount}</small>}</span>}
          {textPageCount > 0 && <span className="chapter-question-attachment" title={`Текстовых страниц: ${textPageCount}`} aria-label={`Текстовых страниц: ${textPageCount}`}><Quote size={15} />{textPageCount > 1 && <small>{textPageCount}</small>}</span>}
          {answer && <Check className="chapter-question-status" size={17} aria-label="Есть ответ" />}
        </div>}
      </>;
      return <li key={question.id}>
        {readOnly ? <div className={className}>{content}</div> : <Link className={className} href={`/dashboard/books/${bookId}/write?question=${question.id}`}>{content}</Link>}
      </li>;
    })}</ol>
    {questions.length === 0 && <p className="question-pool-note">{answeredOnly ? "В этой главе нет вопросов с ответами." : "В главе пока нет вопросов."}</p>}
  </>;
}
