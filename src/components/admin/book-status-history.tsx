import { BOOK_PRODUCTION_LABELS } from "@/lib/books/production-status";
import type { BookStatusHistoryEntry } from "@/lib/admin/book-status-history";
import { formatPhone } from "@/lib/auth/phone";

const roleLabels = { admin: "Администратор", manager: "Менеджер", user: "Пользователь" } as const;

export function BookStatusHistory({ entries, loadError }: { entries: BookStatusHistoryEntry[]; loadError?: string }) {
  return <section className="admin-card book-status-history" aria-labelledby="book-status-history-title">
    <header><div><h2 id="book-status-history-title">История статусов</h2><p>Все переходы книги между этапами производства.</p></div></header>
    {loadError && <p className="admin-form-error" role="alert">{loadError}</p>}
    {!loadError && entries.length === 0 && <p className="book-status-history__empty">Изменений статуса пока нет.</p>}
    {entries.length > 0 && <ol>
      {entries.map((entry) => <li key={entry.id}>
        <span className={`order-status order-status--${entry.toStatus}`}>{BOOK_PRODUCTION_LABELS[entry.toStatus]}</span>
        <div>
          <strong>{entry.fromStatus ? `${BOOK_PRODUCTION_LABELS[entry.fromStatus]} → ${BOOK_PRODUCTION_LABELS[entry.toStatus]}` : `Начальный статус: ${BOOK_PRODUCTION_LABELS[entry.toStatus]}`}</strong>
          <small>{entry.actorPhone ? `${roleLabels[entry.actorRole ?? "user"]} · ${formatPhone(entry.actorPhone)}` : "Система"}</small>
        </div>
        <time dateTime={entry.changedAt}>{new Date(entry.changedAt).toLocaleString("ru-KZ", { timeZone: "Asia/Almaty", dateStyle: "medium", timeStyle: "short" })}</time>
      </li>)}
    </ol>}
  </section>;
}
