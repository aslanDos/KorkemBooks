"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollTimeline({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let frame = 0;
    let trackTop = 0;
    let trackHeight = 0;

    const update = () => {
      frame = 0;
      // The fill follows the reading position, just below the viewport centre.
      const distance = window.innerHeight * 0.6 - list.getBoundingClientRect().top - trackTop;
      const progress = trackHeight > 0 ? Math.min(1, Math.max(0, distance / trackHeight)) : 0;
      list.style.setProperty("--timeline-progress", String(progress));
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const measure = () => {
      const track = window.getComputedStyle(list, "::before");
      trackTop = parseFloat(track.top) || 0;
      trackHeight = Math.max(0, list.clientHeight - trackTop - (parseFloat(track.bottom) || 0));
      scheduleUpdate();
    };

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <ol ref={listRef} className="landing-steps" role="list">{children}</ol>;
}
