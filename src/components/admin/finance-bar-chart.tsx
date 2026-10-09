"use client";

import { useState } from "react";
import type { FinanceBucket, FinancePeriod } from "@/lib/admin/finance-types";

const money = new Intl.NumberFormat("ru-KZ");
const compactMoney = new Intl.NumberFormat("ru-KZ", { notation: "compact", maximumFractionDigits: 1 });

function niceMaximum(value: number) {
  if (value <= 0) return 1;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1);
  return Math.ceil((value * 1.1) / step) * step;
}

export function FinanceBarChart({ buckets, period }: { buckets: FinanceBucket[]; period: FinancePeriod }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const rawMaximum = Math.max(0, ...buckets.map((bucket) => Math.max(bucket.received, bucket.refunds + bucket.costs)));
  const maximum = niceMaximum(rawMaximum);
  const ticks = rawMaximum > 0
    ? [maximum, maximum * .75, maximum * .5, maximum * .25, 0].map((value) => `${compactMoney.format(value)} ₸`)
    : ["", "", "", "", "0 ₸"];

  return <figure className={`finance-chart finance-chart--${period}`}>
    <div className="finance-chart__legend"><span><i className="finance-chart__key finance-chart__key--in" />Поступления</span><span><i className="finance-chart__key finance-chart__key--out" />Расходы и возвраты</span></div>
    <div className="finance-chart__body">
      <div className="finance-chart__axis" aria-hidden="true"><div>{ticks.map((tick, index) => <span key={`${tick}-${index}`}>{tick}</span>)}</div></div>
      <div className="finance-chart__scroll" role="region" aria-label="График финансов по периодам" tabIndex={0}>
        <div className="finance-chart__plot">
          {buckets.map((bucket, index) => {
            const result = bucket.received - bucket.refunds - bucket.costs;
            const hasTransactions = bucket.received > 0 || bucket.costs > 0 || bucket.refunds > 0;
            const tooltipId = `finance-tooltip-${period}-${bucket.key}`;
            const isActive = activeKey === bucket.key;
            const bars = <><span className="finance-chart__bars"><span className="finance-chart__bar finance-chart__bar--in" style={{ height: `${(bucket.received / maximum) * 100}%` }} /><span className="finance-chart__bar finance-chart__bar--out" style={{ height: `${((bucket.costs + bucket.refunds) / maximum) * 100}%` }} /></span><span className="finance-chart__label">{period === "day" && index % 5 !== 0 && index !== buckets.length - 1 ? "" : bucket.label}</span></>;
            if (!hasTransactions) return <div className="finance-chart__group is-empty" key={bucket.key}>{bars}</div>;
            return <button className={`finance-chart__group${isActive ? " is-active" : ""}`} type="button" key={bucket.key} aria-label={`${bucket.label}: поступления ${money.format(bucket.received)} ₸, расходы ${money.format(bucket.costs)} ₸, возвраты ${money.format(bucket.refunds)} ₸, результат ${money.format(result)} ₸`} aria-describedby={tooltipId} aria-expanded={isActive} onClick={() => setActiveKey((key) => key === bucket.key ? null : bucket.key)} onKeyDown={(event) => { if (event.key === "Escape") setActiveKey(null); }}>
              {bars}
              <span className="finance-chart__tooltip" id={tooltipId} role="tooltip"><strong>{bucket.label}</strong><span><i className="finance-chart__key finance-chart__key--in" />Поступления <b>{money.format(bucket.received)} ₸</b></span><span><i className="finance-chart__key finance-chart__key--out" />Расходы <b>{money.format(bucket.costs)} ₸</b></span><span><i className="finance-chart__key finance-chart__key--refund" />Возвраты <b>{money.format(bucket.refunds)} ₸</b></span><span className="finance-chart__tooltip-result">Результат <b>{money.format(result)} ₸</b></span></span>
            </button>;
          })}
        </div>
      </div>
    </div>
    <table className="visually-hidden"><caption>Поступления, расходы и возвраты по периодам, тенге</caption><thead><tr><th>Период</th><th>Поступления</th><th>Расходы</th><th>Возвраты</th></tr></thead><tbody>{buckets.map((bucket) => <tr key={bucket.key}><th>{bucket.label}</th><td>{bucket.received}</td><td>{bucket.costs}</td><td>{bucket.refunds}</td></tr>)}</tbody></table>
  </figure>;
}
