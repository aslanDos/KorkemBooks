"use client";

import { useEffect, useRef } from "react";
import { getPageBackgroundColor } from "@/lib/books/cover-palettes";
import { formatChapterTitle } from "@/lib/books/chapter-title-text";
import { fitRenderedChapterTitle } from "@/lib/books/chapter-title-layout";
import type { BookChapterPageStyle, BookChapterTitleSize, BookPageBackground } from "@/lib/books/types";
import type { BookLanguage } from "@/lib/books/types";
import { getBookContent } from "@/lib/books/language";

export function BookChapterPage({ chapterNumber, title, style, titleSize, background, language = "ru" }: { chapterNumber: number; title: string; style: BookChapterPageStyle; titleSize: BookChapterTitleSize; background: BookPageBackground; language?: BookLanguage }) {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    let disposed = false;
    let frame = 0;
    const fit = () => { if (!disposed) fitRenderedChapterTitle(page); };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(schedule);
    observer.observe(page);
    const printMedia = window.matchMedia("print");
    fit();
    void document.fonts.ready.then(() => { if (!disposed) schedule(); });
    document.fonts.addEventListener("loadingdone", schedule);
    window.addEventListener("beforeprint", fit);
    window.addEventListener("afterprint", fit);
    printMedia.addEventListener("change", fit);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
      window.removeEventListener("beforeprint", fit);
      window.removeEventListener("afterprint", fit);
      printMedia.removeEventListener("change", fit);
    };
  }, [title, style, titleSize, chapterNumber]);
  const chapterLabel = getBookContent(language).chapter;
  const label = style === "default" ? `${chapterLabel} ${chapterNumber}` : `${chapterLabel} ${toRomanNumeral(chapterNumber)}`;

  return (
    <div ref={pageRef} className={`preview-chapter-page preview-chapter-page--${style} preview-chapter-page--title-size-${titleSize} preview-chapter-page--colored`} data-chapter-number={String(chapterNumber).padStart(2, "0")} data-no-translate style={{ background: getPageBackgroundColor(background) }}>
      <span>{label}</span>
      <h2 title={title}>{formatChapterTitle(title)}</h2>
    </div>
  );
}

function toRomanNumeral(value: number) {
  const numerals: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let remaining = Math.max(1, Math.floor(value));
  let result = "";
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}
