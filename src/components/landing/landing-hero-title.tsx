"use client";

import { useEffect, useState } from "react";
import { useLocale, type Locale } from "@/components/locale/locale-provider";

const titles: Record<Locale, string> = {
  ru: "Ваша история, которую можно держать в руках",
  kk: "Қолыңызда ұстайтын өз тарихыңыз",
};

function TypedTitle({ id, title }: { id: string; title: string }) {
  const totalLength = title.length;
  const [typedLength, setTypedLength] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = window.requestAnimationFrame(() => setTypedLength(totalLength));
      return () => window.cancelAnimationFrame(frame);
    }

    let interval = 0;
    const delay = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setTypedLength((current) => {
          const next = Math.min(current + 1, totalLength);
          if (next === totalLength) window.clearInterval(interval);
          return next;
        });
      }, 42);
    }, 240);

    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
    };
  }, [totalLength]);

  const wordEntries = Array.from(title.matchAll(/\S+/g), (match) => ({ word: match[0], start: match.index }));
  const words = wordEntries.map(({ word, start }, index) => {
    const visibleLength = Math.min(Math.max(typedLength - start, 0), word.length);
    const isActive = typedLength >= start && typedLength <= start + word.length;

    return (
      <span key={`${word}-${start}`}>
        <span className="landing-typing-word">
          <span className="landing-typing-word__measure">{word}</span>
          <span className="landing-typing-word__typed">
            {word.slice(0, visibleLength)}
            {isActive && <span className="landing-typing-caret" />}
          </span>
        </span>
        {index < wordEntries.length - 1 ? " " : null}
      </span>
    );
  });

  return (
    <h1 id={id} className="landing-hero-title" aria-label={title}>
      <span className="landing-hero-title__typed" aria-hidden="true">
        {words}
      </span>
    </h1>
  );
}

export function LandingHeroTitle({ id }: { id: string }) {
  const { locale } = useLocale();
  return <TypedTitle key={locale} id={id} title={titles[locale]} />;
}
