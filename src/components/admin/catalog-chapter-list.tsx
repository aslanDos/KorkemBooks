"use client";

import { useState } from "react";
import { editCatalogChapterAction } from "@/app/admin/questions/actions";
import type { AvailableBookLanguage } from "@/lib/books/language";

type Chapter = { id: string; position: number; title: string };

export function CatalogChapterList({ chapters, language }: { chapters: Chapter[]; language: AvailableBookLanguage }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(chapter: Chapter) {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const result = await editCatalogChapterAction({ catalogId: chapter.id, language, expectedTitle: saved[chapter.id] ?? chapter.title, title: draft });
      if (result.error) setError(result.error);
      else { setSaved((current) => ({ ...current, [chapter.id]: draft.trim() })); setEditing(null); setMessage(`Название главы ${chapter.position} сохранено.`); }
    } catch { setError("Не удалось сохранить название главы."); }
    finally { setPending(false); }
  }

  return <section className="catalog-chapters" aria-labelledby="catalog-chapters-title">
    <header><div><h2 id="catalog-chapters-title">Названия глав</h2><p>Используются для выбранного типа книги и языка.</p></div></header>
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {message && <p className="catalog-editor__success" role="status">{message}</p>}
    <div>{chapters.map((chapter) => {
      const title = saved[chapter.id] ?? chapter.title;
      const isEditing = editing === chapter.id;
      return <article className="catalog-chapter" key={chapter.id}>
        <span>{chapter.position}</span>
        {isEditing ? <div className="catalog-chapter__form"><label htmlFor={`catalog-chapter-${chapter.id}`}>Название главы</label><input id={`catalog-chapter-${chapter.id}`} value={draft} maxLength={160} onChange={(event) => setDraft(event.target.value)} /><div className="catalog-question__actions"><button type="button" disabled={pending || !draft.trim()} onClick={() => void save(chapter)}>{pending ? "Сохраняем…" : "Сохранить"}</button><button type="button" disabled={pending} onClick={() => { setEditing(null); setError(""); }}>Отмена</button></div></div> : <strong>{title}</strong>}
        {!isEditing && <button className="catalog-question__edit" type="button" onClick={() => { setEditing(chapter.id); setDraft(title); setError(""); setMessage(""); }}>Изменить</button>}
      </article>;
    })}</div>
  </section>;
}
