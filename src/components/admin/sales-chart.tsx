import type { SalesPoint } from "@/lib/admin/types";

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const points = data.map((point, index) => `${(index / Math.max(data.length - 1, 1)) * 100},${88 - (point.value / max) * 72}`).join(" ");
  return <div className="sales-chart">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="График поступлений по месяцам">
      <defs><linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".22" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {[16, 40, 64, 88].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="sales-chart__grid" />)}
      <polygon points={`0,88 ${points} 100,88`} fill="url(#sales-fill)" />
      <polyline points={points} fill="none" className="sales-chart__line" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="sales-chart__labels">{data.map((point) => <span key={point.label}>{point.label}</span>)}</div>
  </div>;
}
