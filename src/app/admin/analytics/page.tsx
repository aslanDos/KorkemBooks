import Link from "next/link";
import { Banknote, CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FinanceBarChart } from "@/components/admin/finance-bar-chart";
import { getFinanceAnalytics, type FinancePeriod } from "@/lib/admin/finance";

const money = new Intl.NumberFormat("ru-KZ");
const formatMoney = (value: number) => `${money.format(value)} ₸`;
const periods: Array<{ value: FinancePeriod; label: string; description: string }> = [
  { value: "day", label: "По дням", description: "Последние 30 дней" },
  { value: "week", label: "По неделям", description: "Последние 12 недель" },
  { value: "month", label: "По месяцам", description: "Последние 12 месяцев" },
];

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const period: FinancePeriod = params.period === "day" || params.period === "week" ? params.period : "month";
  const data = await getFinanceAnalytics(period);
  return <>
    <DashboardHeader title="Продажи и финансы" description="Поступления, расходы и результат по книгам. Все суммы — в тенге." />
    {"error" in data ? <section className="admin-card"><p role="alert" className="admin-form-error">{data.error}</p></section> : <>
      <section className="admin-stats finance-stats">
        <article><span><Banknote size={20} /></span><div><small>Получено за период</small><strong>{formatMoney(data.periodReceived)}</strong><p>Платежи минус возвраты</p></div></article>
        <article><span><ReceiptText size={20} /></span><div><small>Расходы за период</small><strong>{formatMoney(data.periodCosts)}</strong><p>Печать, доставка и другое</p></div></article>
        <article><span><TrendingUp size={20} /></span><div><small>Денежный результат</small><strong>{formatMoney(data.periodResult)}</strong><p>Получено минус расходы</p></div></article>
        <article><span><CircleDollarSign size={20} /></span><div><small>Осталось получить</small><strong>{formatMoney(data.outstandingTotal)}</strong><p>По всем книгам с указанной ценой</p></div></article>
      </section>
      <section className="admin-card finance-analytics-chart">
        <header><div><p className="eyebrow">Движение денег</p><h2>{periods.find((item) => item.value === period)?.description}</h2></div><nav className="finance-periods" aria-label="Группировка графика">{periods.map((item) => <Link key={item.value} href={`/admin/analytics?period=${item.value}`} aria-current={period === item.value ? "page" : undefined}>{item.label}</Link>)}</nav></header>
        <FinanceBarChart buckets={data.buckets} period={period} />
        <p className="finance-chart-note">Столбцы отражают даты фактических операций, а не даты создания книг. Возвраты показаны вместе с расходами; в показателе «Получено» они вычтены.</p>
      </section>
      <section className="admin-card finance-lifetime"><h2>За всё время</h2><div><p><span>Согласованная стоимость книг</span><strong>{formatMoney(data.agreedTotal)}</strong></p><p><span>Получено от клиентов</span><strong>{formatMoney(data.allReceived)}</strong></p><p><span>Расходы</span><strong>{formatMoney(data.allCosts)}</strong></p><p><span>Денежный результат</span><strong>{formatMoney(data.allReceived - data.allCosts)}</strong></p><p><span>Стоимость завершённых книг</span><strong>{formatMoney(data.completedValue)}</strong></p></div><small>Стоимость завершённых книг — отдельный операционный показатель, не бухгалтерское признание выручки.</small></section>
      <section className="admin-card finance-books"><header><div><h2>По книгам</h2><p>Откройте книгу, чтобы указать цену и добавить платежи или расходы.</p></div></header>
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Финансы по книгам"><table className="admin-table"><thead><tr><th>Книга</th><th>Цена</th><th>Получено</th><th>Остаток</th><th>Расходы</th><th>Денежный результат</th></tr></thead><tbody>{data.books.map((book) => <tr key={book.id}><td><Link href={`/admin/books/${book.id}`}>{book.title}</Link></td><td>{book.finance.price === null ? "Не указана" : formatMoney(book.finance.price)}</td><td>{formatMoney(book.finance.received)}</td><td>{book.finance.outstanding === null ? "—" : formatMoney(book.finance.outstanding)}</td><td>{formatMoney(book.finance.costs)}</td><td>{formatMoney(book.finance.cashResult)}</td></tr>)}{data.books.length === 0 && <tr><td colSpan={6}>Книг пока нет.</td></tr>}</tbody></table></div>
      </section>
    </>}
  </>;
}
