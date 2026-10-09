"use client";

import { Check } from "lucide-react";
import { useLocale } from "@/components/locale/locale-provider";
import { BOOK_MINIMUM_SUBMISSION_PAGE_COUNT } from "@/lib/books/progress";

export function BookStructureStats({ chapterCount, questionCount, pageCount, progress, showSubmissionHint = false }: { chapterCount: number; questionCount: number; pageCount: number; progress: number; showSubmissionHint?: boolean }) {
  const percent = Math.max(0, Math.min(100, progress));
  const { locale } = useLocale();
  const isReady = pageCount >= BOOK_MINIMUM_SUBMISSION_PAGE_COUNT;
  const readinessPercent = Math.min(100, Math.floor((pageCount / BOOK_MINIMUM_SUBMISSION_PAGE_COUNT) * 100));
  const remainingPages = Math.max(0, BOOK_MINIMUM_SUBMISSION_PAGE_COUNT - pageCount);

  if (showSubmissionHint) return <div className={`book-overview__progress book-overview__progress--readiness${isReady ? " is-ready" : ""}`}>
    <div className="book-overview__progress-heading">
      <span className="book-overview__label">{locale === "kk" ? "Редакциялауға дайындық" : "Готовность к редактуре"}</span>
      {isReady
        ? <strong className="book-overview__ready-mark" aria-label={locale === "kk" ? "Дайын" : "Готово"}><Check size={20} aria-hidden="true" /></strong>
        : <strong>{pageCount}<small>{locale === "kk" ? "бет" : "стр."}</small></strong>}
    </div>
    <progress value={readinessPercent} max={100} aria-label={locale === "kk" ? "Редакциялауға дайындық" : "Готовность к редактуре"} />
    <div className="book-overview__progress-hint">
      {isReady
        ? <><strong>{locale === "kk" ? "Ең аз көлем дайын" : "Минимальный объём готов"}</strong><span>{locale === "kk" ? "Кітапты редакциялауға жіберуге немесе жазуды жалғастыруға болады" : "Можно отправить книгу на редактуру или продолжить писать"}</span></>
        : <><strong>{locale === "kk" ? `${pageCount} / ${BOOK_MINIMUM_SUBMISSION_PAGE_COUNT} бет` : `${pageCount} из ${BOOK_MINIMUM_SUBMISSION_PAGE_COUNT} страниц`}</strong><span>{locale === "kk" ? `Тағы ${remainingPages} бет толтырыңыз` : `Осталось заполнить ${remainingPages} ${ruPlural(remainingPages, "страницу", "страницы", "страниц")}`}</span></>}
    </div>
    <BookCounts chapterCount={chapterCount} questionCount={questionCount} pageCount={pageCount} locale={locale} />
  </div>;

  return <div className="book-overview__progress">
    <div className="book-overview__progress-heading"><span className="book-overview__label">Прогресс</span><strong>{percent}<small>%</small></strong></div>
    <progress value={percent} max={100} aria-label="Прогресс" />
    <BookCounts chapterCount={chapterCount} questionCount={questionCount} pageCount={pageCount} locale={locale} />
  </div>;
}

function BookCounts({ chapterCount, questionCount, pageCount, locale }: { chapterCount: number; questionCount: number; pageCount: number; locale: "ru" | "kk" }) {
  return <div className="book-overview__counts">
    <span><b>{chapterCount}</b> {locale === "kk" ? "тарау" : ruPlural(chapterCount, "глава", "главы", "глав")}</span>
    <span><b>{questionCount}</b> {locale === "kk" ? "сұрақ" : ruPlural(questionCount, "вопрос", "вопроса", "вопросов")}</span>
    <span><b>{pageCount}</b> {locale === "kk" ? "бет" : ruPlural(pageCount, "страница", "страницы", "страниц")}</span>
  </div>;
}

function ruPlural(value: number, one: string, few: string, many: string) {
  const mod100 = Math.abs(value) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
