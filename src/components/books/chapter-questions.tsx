import Link from "next/link";
import { Check } from "lucide-react";
import type { BookQuestion } from "@/lib/books/types";

export function ChapterQuestions({ bookId, questions, questionOffset }: {
  bookId: string; questions: BookQuestion[]; questionOffset: number;
}) {
  return <>
    <ol>{questions.map((question, index) => <li key={question.id}>
      <Link className={`chapter-question-link${question.answer.trim() ? " chapter-question-link--answered" : ""}`} href={`/dashboard/books/${bookId}/write?question=${question.id}`}>
        <span>{String(questionOffset + index + 1).padStart(2, "0")}</span><p>{question.prompt}</p>
        {question.answer.trim() && <Check className="chapter-question-status" size={17} aria-label="Есть ответ" />}
      </Link>
    </li>)}</ol>
    {questions.length === 0 && <p className="question-pool-note">В главе пока нет вопросов.</p>}
  </>;
}
