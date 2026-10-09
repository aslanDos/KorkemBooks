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
      const markers = list.querySelectorAll<HTMLElement>(".landing-step-number");
      const firstMarker = markers[0];
      const lastMarker = markers[markers.length - 1];
      if (!firstMarker || !lastMarker) return;

      const listBounds = list.getBoundingClientRect();
      const firstBounds = firstMarker.getBoundingClientRect();
      const lastBounds = lastMarker.getBoundingClientRect();
      trackTop = firstBounds.top + firstBounds.height / 2 - listBounds.top;
      const trackBottom = listBounds.bottom - lastBounds.top - lastBounds.height / 2;
      trackHeight = Math.max(0, list.clientHeight - trackTop - trackBottom);
      list.style.setProperty("--timeline-track-top", `${trackTop}px`);
      list.style.setProperty("--timeline-track-bottom", `${trackBottom}px`);
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
