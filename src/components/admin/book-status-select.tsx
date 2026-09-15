"use client";

import { ChevronDown } from "lucide-react";
import { updateBookProductionStatus } from "@/app/admin/books/actions";
import type { BookProductionStatus } from "@/lib/admin/types";

const options: [BookProductionStatus, string][] = [["writing", "Написание"], ["editing", "Редактура"], ["printing", "Печать"], ["ready", "Готово"], ["delivery", "Доставка"], ["received", "Получен"]];

export function BookStatusSelect({ bookId, status }: { bookId: string; status: BookProductionStatus }) {
  return <form action={updateBookProductionStatus} className="book-status-control"><input type="hidden" name="bookId" value={bookId} /><select className={`book-status-select book-status-select--${status}`} name="status" defaultValue={status} onChange={(event) => event.currentTarget.form?.requestSubmit()} aria-label="Статус книги">{options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></form>;
}
