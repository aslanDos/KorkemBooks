export function BookStructureStats({ chapterCount, questionCount, progress }: { chapterCount: number; questionCount: number; progress: number }) {
  const percent = Math.max(0, Math.min(100, progress));
  return <div className="book-overview__progress">
    <div className="book-overview__progress-heading"><span className="book-overview__label">Прогресс</span><strong>{percent}<small>%</small></strong></div>
    <progress value={percent} max={100} aria-label="Прогресс" />
    <div className="book-overview__counts"><span><b>{chapterCount}</b> глав</span><span><b>{questionCount}</b> вопросов</span></div>
  </div>;
}
