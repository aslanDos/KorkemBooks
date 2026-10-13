"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, type Locale } from "@/components/locale/locale-provider";

const copy: Record<Locale, {
  eyebrow: string;
  heading: string;
  description: string;
  recipients: string[];
  questionsLabel: string;
  questions: Array<{ recipient: string; question: string }>;
}> = {
  ru: {
    eyebrow: "Для самых близких",
    heading: "Книга, которую можно посвятить",
    description: "Выберите близкого человека — 100+ вопросов помогут вспомнить важные моменты и рассказать вашу общую историю.",
    recipients: ["маме", "папе", "родителям", "любимому человеку", "сестре", "брату", "другу", "подруге"],
    questionsLabel: "Примеры вопросов из книги",
    questions: [
      { recipient: "Маме", question: "Что она делала ради вас, значение чего вы осознали только после взросления?" },
      { recipient: "Родителям", question: "Какие фразы мамы и папы вы до сих пор можете вспомнить слово в слово?" },
      { recipient: "Девушке", question: "Сохранилась ли ваша первая совместная фотография? Какая история с ней связана?" },
      { recipient: "Парню", question: "В какую самую неловкую или смешную ситуацию вы попадали вместе?" },
      { recipient: "Другу", question: "Какая ваша совместная идея сначала казалась гениальной, но закончилась совершенно не по плану?" },
    ],
  },
  kk: {
    eyebrow: "Ең жақын жандарға",
    heading: "Кітабыңызды арнаңыз",
    description: "Жақын адамыңызды таңдаңыз — 100+ сұрақ маңызды сәттерді еске түсіріп, ортақ тарихыңызды баяндауға көмектеседі.",
    recipients: ["анаңызға", "әкеңізге", "ата-анаңызға", "сүйікті адамыңызға", "әпке-сіңліңізге", "аға-ініңізге", "досыңызға", "құрбыңызға"],
    questionsLabel: "Кітаптағы сұрақтардың үлгілері",
    questions: [
      { recipient: "Анаңызға", question: "Анаңыздың сіз үшін жасаған қандай әрекетінің маңызын тек есейгеннен кейін түсіндіңіз?" },
      { recipient: "Ата-анаңызға", question: "Анаңыз бен әкеңіздің қандай сөздерін әлі күнге дейін сөзбе-сөз есіңізде сақтап жүрсіз?" },
      { recipient: "Қызға", question: "Екеуіңіздің алғашқы бірге түскен суретіңіз бар ма? Сол суреттің тарихы қандай?" },
      { recipient: "Жігітке", question: "Екеуіңіз бірге түскен ең ыңғайсыз немесе күлкілі жағдай қандай?" },
      { recipient: "Досыңызға", question: "Басында керемет идея болып көрініп, соңында мүлде жоспардағыдай болмаған қандай ортақ ойларыңыз болды?" },
    ],
  },
};

function RecipientTypewriter({ recipients }: { recipients: string[] }) {
  const [state, setState] = useState({ index: 0, text: recipients[0], deleting: false });
  const longestRecipient = useMemo(() => recipients.reduce((longest, recipient) => recipient.length > longest.length ? recipient : longest, ""), [recipients]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      if (state.index === 0 && state.text === recipients[0] && !state.deleting) return;
      const frame = window.requestAnimationFrame(() => setState({ index: 0, text: recipients[0], deleting: false }));
      return () => window.cancelAnimationFrame(frame);
    }

    const recipient = recipients[state.index];
    let delay = state.deleting ? 38 : 76;
    if (!state.deleting && state.text === recipient) delay = 1900;
    if (state.deleting && state.text === "") delay = 260;

    const timer = window.setTimeout(() => {
      setState((current) => {
        const currentRecipient = recipients[current.index];
        if (!current.deleting && current.text === currentRecipient) return { ...current, deleting: true };
        if (current.deleting && current.text === "") return { index: (current.index + 1) % recipients.length, text: "", deleting: false };
        return {
          ...current,
          text: current.deleting ? current.text.slice(0, -1) : currentRecipient.slice(0, current.text.length + 1),
        };
      });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [recipients, state]);

  return (
    <span className="landing-recipient-typewriter" aria-hidden="true">
      <span className="landing-recipient-typewriter__measure" aria-hidden="true">{longestRecipient}</span>
      <span className="landing-recipient-typewriter__value">{state.text}<span className="landing-recipient-typewriter__caret" aria-hidden="true" /></span>
    </span>
  );
}

export function LandingRecipientShowcase() {
  const { locale } = useLocale();
  const content = copy[locale];

  return (
    <section className="landing-about landing-section landing-recipient-showcase" id="about" tabIndex={-1} aria-labelledby="recipient-showcase-title">
      <div className="landing-recipient-showcase__heading" data-landing-reveal="heading">
        <p className="landing-eyebrow">{content.eyebrow}</p>
        <h2 id="recipient-showcase-title">
          <span>{content.heading}</span>
          <RecipientTypewriter key={locale} recipients={content.recipients} />
          <span className="visually-hidden">: {content.recipients.join(", ")}</span>
        </h2>
        <p>{content.description}</p>
      </div>

      <div className="landing-question-cloud" aria-label={content.questionsLabel}>
        {content.questions.map((item) => (
          <div
            className="landing-question-card-wrap"
            data-landing-reveal="card-center"
            key={item.question}
          >
            <article className="landing-question-card">
              <div className="landing-question-card__meta">
                <span>{item.recipient}</span>
              </div>
              <p>{item.question}</p>
            </article>
          </div>
        ))}
      </div>

    </section>
  );
}
