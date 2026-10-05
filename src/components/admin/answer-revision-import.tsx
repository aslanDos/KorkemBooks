"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileCheck2, LoaderCircle, Upload } from "lucide-react";
import { importAnswerRevisionsAction, validateRevisionImportAction, type RevisionImportPreview } from "@/app/admin/books/[bookId]/actions";
import { diffAnswerText } from "@/lib/books/answer-revisions";

export function AnswerRevisionImport({ bookId, disabled }: { bookId: string; disabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<RevisionImportPreview[]>([]);
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function selectFile(file?: File) {
    if (!file) return;
    setError(""); setMessage(""); setItems([]);
    if (file.size > 50_000_000) { setError("Файл больше 50 МБ"); return; }
    const text = await file.text();
    startTransition(async () => {
      const result = await validateRevisionImportAction(bookId, text);
      if (result.error) { setError(result.error); return; }
      setItems(result.items ?? []);
      setJson(result.json ?? "");
    });
  }

  function confirmImport() {
    if (!json || pending) return;
    setError(""); setMessage("");
    startTransition(async () => {
      const result = await importAnswerRevisionsAction(bookId, json);
      if (result.error) { setError(result.error); return; }
      setMessage(result.success ?? "Исправления импортированы");
      setItems([]); setJson("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  const changedCount = items.filter((item) => item.changed).length;
  return <section className="admin-card revision-import" aria-labelledby="revision-import-title">
    <header><div><h2 id="revision-import-title">Редакторские исправления</h2><p>Скачайте неизменяемые оригиналы, обработайте их и загрузите JSON с полями <code>questionId</code> и <code>editedAnswer</code>.</p></div></header>
    <div className="revision-import__actions">
      <a className="secondary-content-button" href={`/admin/books/${bookId}/revisions/export`} aria-disabled={disabled} onClick={(event) => { if (disabled) event.preventDefault(); }}><Download size={16} />Скачать оригиналы</a>
      <label className={`secondary-content-button${disabled ? " is-disabled" : ""}`}><Upload size={16} />Проверить JSON<input ref={inputRef} type="file" accept="application/json,.json" disabled={disabled || pending} onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
    </div>
    {pending && <p className="revision-import__status"><LoaderCircle className="spin" size={16} />Проверяем файл…</p>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {message && <p className="revision-import__success" role="status"><FileCheck2 size={16} />{message}</p>}
    {items.length > 0 && <div className="revision-import__preview">
      <header><div><strong>Результат проверки</strong><span>{items.length} записей · {changedCount} изменений</span></div><button className="content-primary-button" type="button" disabled={pending || changedCount === 0} onClick={confirmImport}>Импортировать {changedCount}</button></header>
      <div>{items.map((item) => <article key={item.questionId} className={item.changed ? "" : "is-unchanged"}>
        <h3>{item.question}</h3>
        <p>{item.changed ? diffAnswerText(item.originalAnswer, item.editedAnswer).map((part, index) => part.type === "added" ? <ins key={index}>{part.value}</ins> : part.type === "removed" ? <del key={index}>{part.value}</del> : <span key={index}>{part.value}</span>) : "Без изменений"}</p>
      </article>)}</div>
    </div>}
  </section>;
}
