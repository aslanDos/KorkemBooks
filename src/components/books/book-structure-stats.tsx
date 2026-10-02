export function BookStructureStats({ chapterCount, questionCount, pageCount, progress, showSubmissionHint = false }: { chapterCount: number; questionCount: number; pageCount: number; progress: number; showSubmissionHint?: boolean }) {
  const percent = Math.max(0, Math.min(100, progress));
  return <div className="book-overview__progress">
    <div className="book-overview__progress-heading"><span className="book-overview__label">Прогресс</span><strong>{percent}<small>%</small></strong></div>
    <progress value={percent} max={100} aria-label="Прогресс" />
    {showSubmissionHint && <p className={`book-overview__progress-hint${percent >= 50 ? " is-ready" : ""}`}>{percent >= 50 ? "Книгу уже можно отправить на редактуру" : "При достижении 50% книгу можно отправить на редактуру"}</p>}
    <div className="book-overview__counts"><span><b>{chapterCount}</b> глав</span><span><b>{questionCount}</b> вопросов</span><span><b>{pageCount}</b> страниц</span></div>
  </div>;
}
