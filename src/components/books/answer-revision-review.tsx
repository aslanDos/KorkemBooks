"use client";

import { useState } from "react";
import { Check, History, LoaderCircle, X } from "lucide-react";
import { reviewAllAnswerRevisionsAction, reviewAnswerRevisionAction } from "@/app/dashboard/books/revision-actions";
import { diffAnswerText, type AnswerRevision } from "@/lib/books/answer-revisions";

const STATUS_LABELS = { pending: "Ожидает решения", accepted: "Принято", rejected: "Оставлен оригинал" } as const;

export function AnswerRevisionReview({ bookId, revisions }: { bookId: string; revisions: AnswerRevision[] }) {
  const [optimisticDecisions, setOptimisticDecisions] = useState<Record<string, { status: "accepted" | "rejected"; reviewedAt: string }>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const visibleRevisions = revisions.map((revision) => optimisticDecisions[revision.id] ? { ...revision, ...optimisticDecisions[revision.id] } : revision);
  const pendingRevisions = visibleRevisions.filter((revision) => revision.status === "pending");
  const history = visibleRevisions.filter((revision) => revision.status !== "pending");

  function setOptimisticDecision(revisionIds: Set<string>, decision: "accepted" | "rejected") {
    const reviewedAt = new Date().toISOString();
    setOptimisticDecisions((current) => {
      const next = { ...current };
      revisionIds.forEach((revisionId) => { next[revisionId] = { status: decision, reviewedAt }; });
      return next;
    });
    setSavingIds((current) => new Set([...current, ...revisionIds]));
  }

  function finishSaving(revisionIds: Set<string>) {
    setSavingIds((current) => {
      const next = new Set(current);
      revisionIds.forEach((revisionId) => next.delete(revisionId));
      return next;
    });
  }

  function restorePending(revisionIds: Set<string>) {
    setOptimisticDecisions((current) => {
      const next = { ...current };
      revisionIds.forEach((revisionId) => { delete next[revisionId]; });
      return next;
    });
  }

  async function review(revisionId: string, decision: "accepted" | "rejected") {
    const revisionIds = new Set([revisionId]);
    setError(""); setMessage("");
    setOptimisticDecision(revisionIds, decision);
    try {
      const result = await reviewAnswerRevisionAction(revisionId, bookId, decision);
      if (result.error) { restorePending(revisionIds); setError(result.error); }
      else setMessage(result.success ?? "Решение сохранено");
    } catch {
      restorePending(revisionIds);
      setError("Не удалось сохранить решение. Попробуйте ещё раз");
    } finally {
      finishSaving(revisionIds);
    }
  }

  async function reviewAll(decision: "accepted" | "rejected") {
    const revisionIds = new Set(pendingRevisions.map((revision) => revision.id));
    if (!revisionIds.size) return;
    setError(""); setMessage("");
    setOptimisticDecision(revisionIds, decision);
    try {
      const result = await reviewAllAnswerRevisionsAction(bookId, decision);
      if (result.error) { restorePending(revisionIds); setError(result.error); }
      else setMessage(result.success ?? "Решения сохранены");
    } catch {
      restorePending(revisionIds);
      setError("Не удалось сохранить решения. Попробуйте ещё раз");
    } finally {
      finishSaving(revisionIds);
    }
  }

  if (!revisions.length) return null;
  return <section className="dashboard-section revision-review" aria-labelledby="revision-review-title">
    <header><div><span className="book-approval-eyebrow">Редакторская версия</span><h2 id="revision-review-title">Проверьте исправления</h2><p>Зачёркнут текст оригинала, зелёным выделен вариант редактора. Основной ответ изменится только после вашего согласия.</p></div>
      {pendingRevisions.length > 1 && <div className="revision-review__bulk"><button type="button" onClick={() => void reviewAll("accepted")}><Check size={15} />Принять все</button><button type="button" onClick={() => void reviewAll("rejected")}><X size={15} />Оставить все оригиналы</button></div>}
    </header>
    {savingIds.size > 0 && <p className="revision-import__status"><LoaderCircle className="spin" size={16} />Сохраняем в фоне…</p>}
    {error && <p className="admin-form-error" role="alert">{error}</p>}
    {message && <p className="revision-import__success" role="status">{message}</p>}
    <div className="revision-review__list">{pendingRevisions.map((revision) => <article key={revision.id}>
      <h3>{revision.question}</h3>
      <div className="revision-review__diff">{diffAnswerText(revision.originalAnswer, revision.editedAnswer).map((part, index) => part.type === "added" ? <ins key={index}>{part.value}</ins> : part.type === "removed" ? <del key={index}>{part.value}</del> : <span key={index}>{part.value}</span>)}</div>
      <footer><button className="content-primary-button" type="button" onClick={() => void review(revision.id, "accepted")}><Check size={15} />Принять исправленный вариант</button><button className="secondary-content-button" type="button" onClick={() => void review(revision.id, "rejected")}><X size={15} />Оставить мой вариант</button></footer>
    </article>)}</div>
    {history.length > 0 && <details className="revision-review__history"><summary><History size={15} />История решений ({history.length})</summary><div>{history.map((revision) => <article key={revision.id}><div><strong>{revision.question}</strong><span className={`is-${revision.status}`}>{STATUS_LABELS[revision.status]}</span></div><p>{revision.editedAnswer}</p></article>)}</div></details>}
  </section>;
}
