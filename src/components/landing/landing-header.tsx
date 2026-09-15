"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "#about", label: "О книге" },
  { href: "#how", label: "Как это работает" },
  { href: "#questions", label: "Вопросы" },
];

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const desktop = window.matchMedia("(min-width: 821px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", onResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header ref={headerRef} className={`landing-header${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="landing-header-bar">
        <Link href="/" className="landing-brand" aria-label="KorkemBooks — главная" onClick={() => setOpen(false)}>
          <span className="brand-mark__logo" aria-hidden="true" />
        </Link>
        <nav className="landing-desktop-nav" aria-label="Основная навигация">
          {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>
        <Link href="/login" className="landing-button landing-header-login">Войти</Link>
        <button ref={toggleRef} type="button" className="landing-menu-toggle" aria-label={open ? "Закрыть меню" : "Открыть меню"} aria-expanded={open} aria-controls="landing-mobile-menu" onClick={() => setOpen(!open)}>
          {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>
      <nav id="landing-mobile-menu" className="landing-mobile-nav" aria-label="Мобильная навигация" hidden={!open}>
        {links.map((link) => <a key={link.href} href={link.href} onClick={() => {
          setOpen(false);
          document.querySelector<HTMLElement>(link.href)?.focus({ preventScroll: true });
        }}>{link.label}</a>)}
        <Link href="/login" className="landing-button" onClick={() => setOpen(false)}>Войти в аккаунт</Link>
      </nav>
    </header>
  );
}
