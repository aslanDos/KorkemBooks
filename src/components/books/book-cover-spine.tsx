"use client";

import { useEffect, useRef } from "react";
import { splitSpineAuthor, SPINE_AUTHOR_LETTER_SPACING } from "@/lib/books/spine-text-fit";
import { fitRenderedSpine } from "@/lib/books/spine-text-layout";

export function BookCoverSpine({ title, authorName, showAuthor, letterSpacing, onOverflowChange }: {
  title: string;
  authorName: string;
  showAuthor: boolean;
  letterSpacing: number;
  onOverflowChange: (overflow: boolean) => void;
}) {
  const spineRef = useRef<HTMLElement>(null);
  const tracking = Math.max(0, Math.min(50, letterSpacing)) / 100;

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    let disposed = false;
    let animationFrame = 0;

    const updateFit = () => {
      if (disposed) return;
      const overflow = fitRenderedSpine(spine, tracking);
      if (overflow !== undefined) onOverflowChange(overflow);
    };
    const scheduleFit = () => {
      if (disposed) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateFit);
    };
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(spine);
    for (const slot of spine.querySelectorAll(".colored-cover-spine__title-slot, .colored-cover-spine__author-slot")) observer.observe(slot);
    scheduleFit();
    void document.fonts.ready.then(scheduleFit);
    document.fonts.addEventListener("loadingdone", scheduleFit);
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", scheduleFit);
    };
  }, [title, authorName, showAuthor, tracking, onOverflowChange]);

  return <section ref={spineRef} className={`colored-cover-spine${showAuthor ? "" : " colored-cover-spine--no-author"}`} aria-label="Корешок книги">
    {showAuthor && <div className="colored-cover-spine__author-slot"><div className="colored-cover-spine__author" title={authorName} aria-label={authorName} style={{ letterSpacing: `${SPINE_AUTHOR_LETTER_SPACING}em` }}>
      {splitSpineAuthor(authorName).map((part, index) => <span key={index}>{part}</span>)}
    </div></div>}
    <div className="colored-cover-spine__title-slot"><strong title={title} style={{ letterSpacing: `${tracking}em` }}>{title}</strong></div>
    <span className="colored-cover-spine__mark" role="img" aria-label="KorkemBooks" />
  </section>;
}
