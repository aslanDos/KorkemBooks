"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale, type Locale } from "@/components/locale/locale-provider";
import { BookChapterPage } from "@/components/books/book-chapter-page";
import { BookPrefacePage } from "@/components/books/book-preface-page";
import { getBookContent } from "@/lib/books/language";

type PreviewCopy = {
  eyebrow: string;
  title: string;
  description: string;
  previous: string;
  next: string;
  spreads: string[];
  chapters: Array<[string, string]>;
  chapterLabel: string;
  introQuestion: string;
  introAnswer: string;
  photoQuestion: string;
  photoAnswer: string;
  photoAlt: string;
  footer: string;
};

const copy: Record<Locale, PreviewCopy> = {
  ru: {
    eyebrow: "Предпросмотр книги",
    title: "Посмотрите, как будет выглядеть ваша книга",
    description: "Заполненные истории, фотографии и главы автоматически собираются в готовые развороты.",
    previous: "Предыдущий разворот",
    next: "Следующий разворот",
    spreads: ["Содержание", "Первая глава", "История с фото"],
    chapters: [
      ["С чего всё началось", "5"],
      ["Я люблю тебя такой", "22"],
      ["Наш маленький мир", "37"],
      ["Незабываемые моменты", "46"],
      ["Впереди ещё столько глав", "54"],
    ],
    chapterLabel: "Глава I",
    introQuestion: "Для начала расскажите немного о себе и о том, кому вы посвящаете эту книгу. Почему именно ей?",
    introAnswer: "Эту книгу я посвящаю самому близкому и дорогому для меня человеку — моей любимой. На её страницах я хочу рассказать о своих искренних чувствах и сохранить наши самые ценные совместные моменты, превратив их в память на долгие годы.",
    photoQuestion: "Какой сюрприз, который вы устроили для неё, особенно запомнился вам самому?",
    photoAnswer: "Однажды я приехал к ней без предупреждения с огромным букетом. Я до сих пор помню её удивление и улыбку в тот момент. Теперь эта фотография напоминает нам об одном из самых тёплых дней.",
    photoAlt: "Большой букет белых и розовых роз",
    footer: "История нашей любви",
  },
  kk: {
    eyebrow: "Кітапты алдын ала қарау",
    title: "Кітабыңыздың қалай көрінетінін қараңыз",
    description: "Толтырылған хикаялар, фотосуреттер мен тараулар автоматты түрде дайын кітап беттеріне жиналады.",
    previous: "Алдыңғы жайма",
    next: "Келесі жайма",
    spreads: ["Мазмұны", "Бірінші тарау", "Фотосуреті бар хикая"],
    chapters: [
      ["Бәрі неден басталды", "5"],
      ["Мен сені осындайың үшін жақсы көремін", "22"],
      ["Біздің кішкентай әлеміміз", "37"],
      ["Ұмытылмайтын сәттер", "46"],
      ["Әлі талай тарау алда", "54"],
    ],
    chapterLabel: "I тарау",
    introQuestion: "Алдымен өзіңізді таныстырып, бұл кітапты кімге арнап жатқаныңызды айтып беріңізші. Неліктен дәл осы адамға?",
    introAnswer: "Бұл кітапты жүрегіме ең жақын, ерекше жанға — сүйіктіме арнап жазып отырмын. Оның әр бетінде шынайы сезімдерімді жеткізіп, бірге өткізген қымбат сәттерімізді мәңгілік естелікке айналдырғым келеді.",
    photoQuestion: "Ал сіз оған жасаған қандай тосынсыйды ерекше жақсы көресіз?",
    photoAnswer: "Бір күні мен оған ескертпестен үлкен гүл шоғымен келдім. Сол сәттегі оның таңданысы мен күлкісі әлі күнге дейін есімде. Бұл сурет бізге ең жылы күндердің бірін еске салады.",
    photoAlt: "Ақ және қызғылт раушан гүлдерінің үлкен шоғы",
    footer: "Махаббатым",
  },
};

export function LandingBookPreview() {
  const { locale } = useLocale();
  const [activeSpread, setActiveSpread] = useState(0);
  const [scale, setScale] = useState(.62);
  const stageRef = useRef<HTMLDivElement>(null);
  const content = copy[locale];
  const bookContent = getBookContent(locale);
  const spreadCount = content.spreads.length;
  const setPrevious = () => setActiveSpread((current) => (current - 1 + spreadCount) % spreadCount);
  const setNext = () => setActiveSpread((current) => (current + 1) % spreadCount);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateScale = () => setScale(Math.min(.62, Math.max(.32, (stage.clientWidth - 32) / 800)));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing-book-preview" aria-labelledby="landing-book-preview-title" data-landing-reveal="book">
      <header className="landing-book-preview__intro">
        <p className="landing-eyebrow">{content.eyebrow}</p>
        <h2 id="landing-book-preview-title">{content.title}</h2>
        <p>{content.description}</p>
      </header>

      <div className="landing-book-preview__shell">
        <div className="landing-book-preview__stage" ref={stageRef}>
          <div className="landing-book-preview__spread" key={activeSpread} style={{ zoom: scale }}>
            {activeSpread === 0 && <ContentsSpread content={content} bookContent={bookContent} locale={locale} />}
            {activeSpread === 1 && <ChapterSpread content={content} locale={locale} />}
            {activeSpread === 2 && <PhotoSpread content={content} />}
          </div>

          <nav className="landing-book-preview__pagination" aria-label={content.eyebrow}>
            <button type="button" onClick={setPrevious} aria-label={content.previous}><ChevronLeft size={20} /></button>
            <span aria-live="polite">{content.spreads[activeSpread]}</span>
            <button type="button" onClick={setNext} aria-label={content.next}><ChevronRight size={20} /></button>
          </nav>
        </div>
      </div>
    </section>
  );
}

function PageFooter({ label, page, light = false }: { label: string; page: number; light?: boolean }) {
  return <footer className={`preview-page__footer${light ? " landing-preview-page__footer--light" : ""}`}><p className="preview-page__chapter">{label}</p><span className="preview-page__number">{page}</span></footer>;
}

function ContentsSpread({ content, bookContent, locale }: { content: PreviewCopy; bookContent: ReturnType<typeof getBookContent>; locale: Locale }) {
  return <>
    <article className="preview-page landing-preview-page">
      <BookPrefacePage language={locale} />
    </article>
    <article className="preview-page landing-preview-page">
      <div className="preview-contents-page">
        <h2>{bookContent.contents}</h2>
        <ol>{content.chapters.map(([title, page], index) => <li key={title}><span className="preview-contents-page__heading"><span className="preview-contents-page__chapter-number">{String(index + 1).padStart(2, "0")}</span><span className="preview-contents-page__title">{title}</span></span><i aria-hidden="true" /><b>{page}</b></li>)}</ol>
      </div>
    </article>
  </>;
}

function ChapterSpread({ content, locale }: { content: PreviewCopy; locale: Locale }) {
  return <>
    <article className="preview-page preview-page--chapter landing-preview-page">
      <BookChapterPage chapterNumber={1} title={content.chapters[0][0]} style="numeral" titleSize={8} background="burgundy" language={locale} />
    </article>
    <article className="preview-page preview-page--question-size-10 preview-page--answer-size-18 landing-preview-page">
      <div className="preview-page__content"><div className="preview-page__body"><p className="preview-page__question">{content.introQuestion}</p><p className="preview-page__answer">{content.introAnswer}</p></div></div>
      <PageFooter label={content.footer} page={6} />
    </article>
  </>;
}

function PhotoSpread({ content }: { content: PreviewCopy }) {
  return <>
    <article className="preview-page preview-page--photo landing-preview-page landing-preview-page--photo">
      <div className="landing-preview-page__photo">
        <Image src="/images/landing-preview-flowers.jpg" alt={content.photoAlt} fill priority sizes="(max-width: 600px) 44vw, 420px" />
      </div>
      <PageFooter label={content.footer} page={7} light />
    </article>
    <article className="preview-page preview-page--question-size-10 preview-page--answer-size-18 landing-preview-page">
      <div className="preview-page__content"><div className="preview-page__body"><p className="preview-page__question">{content.photoQuestion}</p><p className="preview-page__answer">{content.photoAnswer}</p></div></div>
      <PageFooter label={content.footer} page={8} />
    </article>
  </>;
}
