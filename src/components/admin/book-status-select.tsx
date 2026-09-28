"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { updateBookProductionStatus } from "@/app/admin/books/actions";
import type { BookProductionStatus } from "@/lib/admin/types";
import { BOOK_PRODUCTION_LABELS } from "@/lib/books/production-status";

const nextStatuses: Record<BookProductionStatus, BookProductionStatus[]> = {
  writing: ["editing"], editing: ["writing"], approval: [], printing: ["ready", "editing"],
  ready: ["delivery", "editing"], delivery: ["received", "editing"], received: ["editing"],
};

export function BookStatusSelect({ bookId, status }: { bookId: string; status: BookProductionStatus }) {
  const router = useRouter();
  const [choice, setChoice] = useState<{ from: BookProductionStatus; to: BookProductionStatus } | null>(null);
  const selected = choice?.from === status ? choice.to : status;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function change(value: BookProductionStatus) {
    setChoice({ from: status, to: value });
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.set("bookId", bookId);
      form.set("status", value);
      const result = await updateBookProductionStatus(form);
      if (result.error) { setError(result.error); setChoice(null); }
      else router.refresh();
    } catch {
      setChoice(null);
      setError("Не удалось сменить этап. Попробуйте ещё раз");
    } finally { setPending(false); }
  }

  return <div className="book-status-wrapper"><div className="book-status-control"><select className={`book-status-select book-status-select--${selected}`} value={selected} disabled={pending || nextStatuses[status].length === 0} onChange={(event) => void change(event.target.value as BookProductionStatus)} aria-label="Статус книги" aria-describedby={error ? `book-status-error-${bookId}` : undefined}>{[status, ...nextStatuses[status]].map((value) => <option value={value} key={value}>{BOOK_PRODUCTION_LABELS[value]}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></div>{error && <span id={`book-status-error-${bookId}`} role="alert" className="book-status-error">{error}</span>}</div>;
}
