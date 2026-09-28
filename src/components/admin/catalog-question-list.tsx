"use client";

import { useState } from "react";
import { editCatalogQuestionAction } from "@/app/admin/questions/actions";
import type { AvailableBookLanguage } from "@/lib/books/language";

type Question = { id: string; number: number; prompt: string; missingTranslation: boolean };

export function CatalogQuestionList({ questions, language }: { questions: Question[]; language: AvailableBookLanguage }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const filtered = questions.filter((question) => `${question.number} ${saved[question.id] ?? question.prompt}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

  async function save(question: Question) {
    if (pending) return;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await editCatalogQuestionAction({ catalogId: question.id, language, expectedPrompt: saved[question.id] ?? question.prompt, prompt: draft });
      if (result.error) setError(result.error);
      else {
        setSaved((current) => ({ ...current, [question.id]: draft.trim() }));
        setEditing(null);
        setSuccess(`Вопрос №${question.number} сохранён.`);
      }
    } catch {
      setError("Не удалось сохранить вопрос. Попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  return <div className="catalog-editor__list">
    <label className="catalog-editor__search">Поиск по вопросам <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Номер или текст вопроса" /></label>
    <p className="catalog-editor__count">Показано {filtered.length} из {questions.length}</p>
    {error && <p role="alert" className="admin-form-error">{error}</p>}
    {success && <p role="status" className="catalog-editor__success">{success}</p>}
    {filtered.map((question) => {
      const prompt = saved[question.id] ?? question.prompt;
      const isEditing = editing === question.id;
      return <article className="catalog-question" key={question.id}>
        <span className="catalog-question__number">{question.number}</span>
        <div className="catalog-question__body">
          {isEditing ? <>
            <label htmlFor={`catalog-question-${question.id}`}>Формулировка вопроса</label>
            <textarea id={`catalog-question-${question.id}`} value={draft} maxLength={1000} onChange={(event) => setDraft(event.target.value)} />
            <div className="catalog-question__actions"><button type="button" disabled={pending || !draft.trim()} onClick={() => void save(question)}>{pending ? "Сохраняем…" : "Сохранить"}</button><button type="button" disabled={pending} onClick={() => { setEditing(null); setError(""); }}>Отмена</button></div>
          </> : <><p>{prompt}</p>{question.missingTranslation && !saved[question.id] && <small>Перевод отсутствует — показан русский текст</small>}</>}
        </div>
        {!isEditing && <button className="catalog-question__edit" type="button" onClick={() => { setEditing(question.id); setDraft(prompt); setError(""); setSuccess(""); }}>Изменить</button>}
      </article>;
    })}
    {filtered.length === 0 && <p>Вопросы не найдены.</p>}
  </div>;
}
