"use client";

import { useState } from "react";
import { EMPTY_ANSWER_FORMAT, RichAnswerEditor, RichAnswerText } from "@/components/books/rich-answer-editor";
import type { AnswerFormat } from "@/lib/books/types";

const question = "Как вы поняли, что встретили свою любовь?";
const initialAnswer = "Это случилось не в один особенный момент. Просто однажды я заметил, что первым делом хочу рассказать тебе обо всём, что произошло за день.\n\nРядом с тобой даже самые обычные вечера стали воспоминаниями, которые хочется бережно хранить.";

export function LandingEditorDemo() {
  const [answer, setAnswer] = useState(initialAnswer);
  const [format, setFormat] = useState<AnswerFormat>(EMPTY_ANSWER_FORMAT);

  return (
    <section className="landing-editor-demo" aria-label="Пример редактора книги">
      <div className="landing-editor-demo__workspace">
        <div className="book-inline-editor landing-editor-demo__editor">
          <div className="landing-editor-demo__prompt">
            <h2>{question}</h2>
          </div>

          <RichAnswerEditor
            value={answer}
            format={format}
            onChange={(nextAnswer, nextFormat) => {
              setAnswer(nextAnswer);
              setFormat(nextFormat);
            }}
          />
        </div>

        <aside className="landing-editor-demo__preview" aria-label="Предпросмотр страницы">
          <div className="landing-editor-demo__preview-heading">
            <span>Превью</span>
            <small>Страница 6</small>
          </div>
          <div className="landing-editor-demo__stage">
            <div className="landing-editor-demo__page">
              <div className="landing-editor-demo__page-body">
                <p className="landing-editor-demo__page-question">{question}</p>
                <p className="landing-editor-demo__page-answer">
                  {answer.trim() ? <RichAnswerText text={answer} format={format} /> : <span className="landing-editor-demo__empty">Ваша история появится здесь</span>}
                </p>
              </div>
              <footer><span>История нашей любви</span><b>6</b></footer>
            </div>
          </div>
          <p className="landing-editor-demo__hint">Пишите слева — и сразу смотрите, как история выглядит в книге.</p>
        </aside>
      </div>
    </section>
  );
}
