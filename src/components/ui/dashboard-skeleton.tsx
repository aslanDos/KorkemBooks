type DashboardSkeletonProps = {
  variant?: "overview" | "library" | "book" | "form" | "cover" | "workspace" | "settings";
};

function Line({ width = "100%", large = false }: { width?: string; large?: boolean }) {
  return <span className={`skeleton-line${large ? " skeleton-line--large" : ""}`} style={{ width }} />;
}

function HeaderSkeleton() {
  return <div className="skeleton-header"><div><Line width="220px" large /><Line width="310px" /></div></div>;
}

function BookCards({ count = 3 }: { count?: number }) {
  return <div className="skeleton-book-grid">{Array.from({ length: count }, (_, index) => <div className="skeleton-book-card" key={index}><span className="skeleton-book-card__mark" /><div><Line width="42%" /><Line width="76%" large /><Line width="58%" /></div><span className="skeleton-progress" /></div>)}</div>;
}

export function DashboardSkeleton({ variant = "overview" }: DashboardSkeletonProps) {
  return <div className={`dashboard-skeleton dashboard-skeleton--${variant}`} role="status" aria-live="polite" aria-label="Загрузка страницы">
    {variant !== "book" && variant !== "workspace" && <HeaderSkeleton />}

    {variant === "overview" && <><div className="skeleton-overview"><div className="skeleton-hero"><Line width="34%" /><Line width="72%" large /><Line width="88%" /><Line width="64%" /><span className="skeleton-button" /></div><div className="skeleton-stat"><span className="skeleton-circle" /><Line width="70px" large /><Line width="120px" /></div></div><section className="skeleton-section"><Line width="180px" large /><Line width="280px" /><BookCards /></section></>}

    {variant === "library" && <section className="skeleton-section"><div className="skeleton-section__heading"><div><Line width="150px" large /><Line width="80px" /></div></div><BookCards count={3} /></section>}

    {variant === "book" && <><Line width="110px" /><div className="book-overview book-overview--summary skeleton-book-overview"><div className="book-summary-card"><span className="skeleton-line skeleton-summary-cover" /><div className="skeleton-summary-details"><Line width="90px" /><Line width="75%" large /><Line width="60%" /><Line width="45%" /><span className="skeleton-button" /></div></div><div><Line width="70px" /><Line width="100%" /><Line width="75%" /></div></div><div className="skeleton-section__heading"><Line width="210px" large /><span className="skeleton-button skeleton-button--wide" /></div><div className="skeleton-chapters">{Array.from({ length: 4 }, (_, index) => <div key={index}><span className="skeleton-circle" /><div><Line width="46%" large /><Line width="28%" /></div></div>)}</div></>}

    {variant === "form" && <section className="skeleton-form"><Line width="190px" large /><Line width="320px" />{Array.from({ length: 4 }, (_, index) => <div className="skeleton-field" key={index}><Line width="100px" /><span /></div>)}<span className="skeleton-button skeleton-button--wide" /></section>}

    {variant === "cover" && <><Line width="190px" /><div className="skeleton-cover-layout"><section className="skeleton-cover-controls"><Line width="230px" large /><Line width="80%" />{Array.from({ length: 3 }, (_, index) => <div className="skeleton-field" key={index}><Line width="90px" /><span /></div>)}<div className="skeleton-cover-cards">{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div></section><aside className="skeleton-cover-preview"><Line width="140px" /><span /></aside></div></>}

    {variant === "workspace" && <><Line width="180px" /><div className="skeleton-workspace"><section><Line width="220px" large /><Line width="75%" />{Array.from({ length: 5 }, (_, index) => <Line width={`${88 - index * 7}%`} key={index} />)}</section><aside><Line width="120px" /><span /></aside></div></>}

    {variant === "settings" && <section className="skeleton-section skeleton-settings">{Array.from({ length: 4 }, (_, index) => <div key={index}><Line width={index === 1 ? "170px" : "150px"} large /><Line width={index === 1 ? "55%" : "38%"} /><Line width={index === 0 ? "62%" : "45%"} /></div>)}</section>}
    <span className="visually-hidden">Загрузка…</span>
  </div>;
}
