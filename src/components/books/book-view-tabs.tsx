"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ListChecks } from "lucide-react";

export function BookViewTabs({ bookId, active }: { bookId: string; active: "questions" | "preview" }) {
  const router = useRouter();
  const questionsHref = `/dashboard/books/${bookId}`;
  const previewHref = `/dashboard/books/${bookId}/preview`;

  useEffect(() => {
    if (active !== "questions") return;
    const timeout = window.setTimeout(() => router.prefetch(previewHref), 700);
    return () => window.clearTimeout(timeout);
  }, [active, previewHref, router]);

  return <nav className="book-view-tabs" aria-label="Разделы книги">
    <Link href={questionsHref} className={active === "questions" ? "is-active" : ""} aria-current={active === "questions" ? "page" : undefined}><ListChecks size={17} />Вопросы</Link>
    <Link href={previewHref} className={active === "preview" ? "is-active" : ""} aria-current={active === "preview" ? "page" : undefined} onPointerEnter={() => router.prefetch(previewHref)} onFocus={() => router.prefetch(previewHref)}><BookOpen size={17} />Предпросмотр</Link>
  </nav>;
}
