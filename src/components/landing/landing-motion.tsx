"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    root.dataset.motion = "ready";
    const revealElements = Array.from(root.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-visible", "");
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -9%", threshold: 0.12 });
    revealElements.forEach((element) => revealObserver.observe(element));

    return () => {
      revealObserver.disconnect();
      delete root.dataset.motion;
    };
  }, []);

  return null;
}
