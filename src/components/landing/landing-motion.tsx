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

    const parallaxElements = Array.from(root.querySelectorAll<HTMLElement>("[data-motion-depth]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      root.style.setProperty("--hero-scroll", String(Math.min(1, window.scrollY / Math.max(520, viewportHeight * 0.82))));

      for (const element of parallaxElements) {
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom < -120 || bounds.top > viewportHeight + 120) continue;
        const depth = Number(element.dataset.motionDepth ?? 0);
        const position = (bounds.top + bounds.height / 2 - viewportHeight / 2) / viewportHeight;
        element.style.setProperty("--motion-shift", `${Math.max(-1, Math.min(1, position)) * depth}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
      delete root.dataset.motion;
      root.style.removeProperty("--hero-scroll");
    };
  }, []);

  return null;
}
