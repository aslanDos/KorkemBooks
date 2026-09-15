import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="О сервисе korkembooks">
        <BrandMark variant="light" href="/" />
        <div className="auth-story__content">
          <p className="eyebrow">Ваша история достойна книги</p>
          <h1>Сохраните то, что действительно важно.</h1>
          <p>Отвечайте на простые вопросы, а мы поможем превратить ваши воспоминания в красивую книгу для семьи и будущих поколений.</p>
        </div>
        <p className="auth-story__quote">«Истории связывают поколения. Начните свою сегодня»</p>
      </section>
      <section className="auth-panel">
        <div className="auth-panel__theme"><ThemeToggle /></div>
        <div className="auth-panel__mobile-brand"><BrandMark href="/" /></div>
        <div className="auth-panel__content">
          <header className="auth-heading">
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </header>
          {children}
          {footer && <p className="auth-panel__signup">{footer}</p>}
        </div>
      </section>
    </main>
  );
}
