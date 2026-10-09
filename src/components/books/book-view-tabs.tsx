"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ListChecks } from "lucide-react";

export function BookViewTabs({ bookId }: { bookId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const questionsHref = `/dashboard/books/${bookId}`;
  const previewHref = `/dashboard/books/${bookId}/preview`;
  const active = pathname.startsWith(previewHref) ? "preview" : "questions";

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
