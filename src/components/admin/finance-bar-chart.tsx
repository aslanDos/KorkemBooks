import type { FinanceBucket, FinancePeriod } from "@/lib/admin/finance";

const money = new Intl.NumberFormat("ru-KZ");

export function FinanceBarChart({ buckets, period }: { buckets: FinanceBucket[]; period: FinancePeriod }) {
  const max = Math.max(1, ...buckets.map((bucket) => Math.max(bucket.received, bucket.refunds + bucket.costs)));
  return <figure className={`finance-chart finance-chart--${period}`}>
    <div className="finance-chart__legend"><span><i className="finance-chart__key finance-chart__key--in" />Поступления</span><span><i className="finance-chart__key finance-chart__key--out" />Расходы и возвраты</span></div>
    <div className="finance-chart__scroll" role="region" aria-label="График финансов по периодам" tabIndex={0}>
      <div className="finance-chart__plot">
        {buckets.map((bucket, index) => <div className="finance-chart__group" key={bucket.key} title={`${bucket.label}: поступило ${money.format(bucket.received)} ₸, расходы ${money.format(bucket.costs)} ₸, возвраты ${money.format(bucket.refunds)} ₸`}>
          <div className="finance-chart__bars"><span className="finance-chart__bar finance-chart__bar--in" style={{ height: `${(bucket.received / max) * 100}%` }} /><span className="finance-chart__bar finance-chart__bar--out" style={{ height: `${((bucket.costs + bucket.refunds) / max) * 100}%` }} /></div>
          <span className="finance-chart__label">{period === "day" && index % 5 !== 0 && index !== buckets.length - 1 ? "" : bucket.label}</span>
        </div>)}
      </div>
    </div>
    <table className="visually-hidden"><caption>Поступления, расходы и возвраты по периодам, тенге</caption><thead><tr><th>Период</th><th>Поступления</th><th>Расходы</th><th>Возвраты</th></tr></thead><tbody>{buckets.map((bucket) => <tr key={bucket.key}><th>{bucket.label}</th><td>{bucket.received}</td><td>{bucket.costs}</td><td>{bucket.refunds}</td></tr>)}</tbody></table>
  </figure>;
}
