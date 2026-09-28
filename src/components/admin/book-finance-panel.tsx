"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addBookFinanceEntryAction, saveBookPriceAction, voidBookFinanceEntryAction } from "@/app/admin/books/[bookId]/finance-actions";
import { FINANCE_KIND_LABELS, type BookFinance, type FinanceKind } from "@/lib/admin/finance-types";

const money = new Intl.NumberFormat("ru-KZ");
const formatMoney = (value: number) => `${money.format(value)} ₸`;

export function BookFinancePanel({ bookId, finance, today, loadError }: { bookId: string; finance: BookFinance | null; today: string; loadError?: string }) {
  const router = useRouter();
  const [price, setPrice] = useState(finance?.price === null || finance?.price === undefined ? "" : String(finance.price));
  const [kind, setKind] = useState<FinanceKind>("deposit");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function savePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setMessage("");
    try {
      const result = await saveBookPriceAction({ bookId, price });
      setIsError(Boolean(result.error)); setMessage(result.error ?? "Цена сохранена");
      if (!result.error) router.refresh();
    } catch { setIsError(true); setMessage("Не удалось сохранить цену"); }
    finally { setPending(false); }
  }

  async function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setMessage("");
    try {
      const result = await addBookFinanceEntryAction({ bookId, kind, amount, occurredOn, note });
      setIsError(Boolean(result.error)); setMessage(result.error ?? "Операция записана");
      if (!result.error) { setAmount(""); setNote(""); router.refresh(); }
    } catch { setIsError(true); setMessage("Не удалось записать операцию"); }
    finally { setPending(false); }
  }

  async function voidEntry(entryId: string) {
    if (pending || !window.confirm("Отменить эту финансовую операцию? Она останется в истории.")) return;
    setPending(true); setMessage("");
    try {
      const result = await voidBookFinanceEntryAction({ bookId, entryId });
      setIsError(Boolean(result.error)); setMessage(result.error ?? "Операция отменена");
      if (!result.error) router.refresh();
    } catch { setIsError(true); setMessage("Не удалось отменить операцию"); }
    finally { setPending(false); }
  }

  return <section className="admin-card book-finance-panel" aria-labelledby="book-finance-title">
    <header><div><h2 id="book-finance-title">Финансы книги</h2><p>Цена, поступления и фактические расходы в тенге.</p></div></header>
    {loadError && <p role="alert" className="admin-form-error">{loadError}</p>}
    {finance && <>
      <div className="book-finance-totals">
        <div><span>Согласованная цена</span><strong>{finance.price === null ? "Не указана" : formatMoney(finance.price)}</strong></div>
        <div><span>Получено, включая предоплату</span><strong>{formatMoney(finance.received)}</strong><small>Предоплата: {formatMoney(finance.deposit)}{finance.refunds > 0 ? ` · возвраты: ${formatMoney(finance.refunds)}` : ""}</small></div>
        <div><span>Осталось получить</span><strong>{finance.outstanding === null ? "—" : formatMoney(finance.outstanding)}</strong>{finance.price !== null && finance.received > finance.price && <small>Переплата: {formatMoney(finance.received - finance.price)}</small>}</div>
        <div><span>Расходы</span><strong>{formatMoney(finance.costs)}</strong><small>Печать: {formatMoney(finance.printing)} · доставка: {formatMoney(finance.delivery)}</small></div>
        <div><span>Денежный результат</span><strong>{formatMoney(finance.cashResult)}</strong><small>Получено минус оплаченные расходы</small></div>
      </div>
      <div className="book-finance-forms">
        <form onSubmit={(event) => void savePrice(event)}>
          <h3>Цена книги</h3>
          <label>Согласованная цена, ₸<input type="number" min="0" max="999999999999" step="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
          <button type="submit" disabled={pending}>Сохранить цену</button>
        </form>
        <form onSubmit={(event) => void addEntry(event)}>
          <h3>Новая операция</h3>
          <div className="book-finance-fields">
            <label>Тип операции<select value={kind} onChange={(event) => setKind(event.target.value as FinanceKind)}>{Object.entries(FINANCE_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Сумма, ₸<input type="number" min="1" max="999999999999" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            <label>Дата<input type="date" required max={today} value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
          </div>
          <label>Комментарий (необязательно)<input maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Например, номер перевода или тип печати" /></label>
          <button type="submit" disabled={pending || finance.price === null}>Добавить операцию</button>
          {finance.price === null && <small>Сначала сохраните цену книги.</small>}
        </form>
      </div>
      <p className="book-finance-message" role={isError ? "alert" : "status"}>{message}</p>
      <div className="book-finance-history"><h3>История операций</h3>
        {finance.entries.length === 0 ? <p>Платежей и расходов пока нет.</p> : <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="История финансовых операций"><table className="admin-table"><thead><tr><th>Дата</th><th>Операция</th><th>Сумма</th><th>Комментарий</th><th></th></tr></thead><tbody>{finance.entries.map((entry) => <tr key={entry.id} className={entry.voidedAt ? "book-finance-voided" : ""}><td>{new Date(`${entry.occurredOn}T00:00:00Z`).toLocaleDateString("ru-KZ", { timeZone: "UTC" })}</td><td>{FINANCE_KIND_LABELS[entry.kind]}{entry.voidedAt && <small>Отменена</small>}</td><td>{formatMoney(entry.amount)}</td><td>{entry.note || "—"}</td><td>{!entry.voidedAt && <button type="button" disabled={pending} onClick={() => void voidEntry(entry.id)}>Отменить</button>}</td></tr>)}</tbody></table></div>}
      </div>
    </>}
  </section>;
}
