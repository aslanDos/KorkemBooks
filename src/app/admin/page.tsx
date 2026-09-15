import Link from "next/link";
import { ArrowRight, Banknote, BookCopy, UserCog, Users } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SalesChart } from "@/components/admin/sales-chart";
import { BookStatusPill } from "@/components/admin/status-pill";
import { getAdminOverview } from "@/lib/admin/queries";

const money = new Intl.NumberFormat("ru-KZ");
export default async function AdminPage() {
  const data = await getAdminOverview();
  return <>
    <DashboardHeader title="Панель управления" description="Общая картина KorkemBooks на сегодня" />
    <section className="admin-stats">
      <article><span><Users size={20} /></span><div><small>Пользователи</small><strong>{data.userCount}</strong><p>зарегистрировано</p></div></article>
      <article><span><UserCog size={20} /></span><div><small>Менеджеры</small><strong>{data.managerCount}</strong><p>{data.adminCount} администратор</p></div></article>
      <article><span><BookCopy size={20} /></span><div><small>Книги в работе</small><strong>{data.activeBooks}</strong><p>на разных этапах</p></div></article>
      <article><span><Banknote size={20} /></span><div><small>Продажи</small><strong>{money.format(data.salesTotal)} ₸</strong><p className="positive">+{data.salesChange}% за месяц</p></div></article>
    </section>
    <div className="admin-dashboard-grid">
      <section className="admin-card admin-sales-card"><header><div><p className="eyebrow">Аналитика</p><h2>Продажи за 7 месяцев</h2></div><Link href="/admin/analytics">Подробнее <ArrowRight size={14} /></Link></header><SalesChart data={data.sales} /></section>
      <section className="admin-card admin-quick-card"><p className="eyebrow">Быстрое действие</p><h2>Новый сотрудник</h2><p>Создайте аккаунт пользователя или менеджера и передайте ему временный пароль.</p><Link className="content-primary-button" href="/admin/users/new">Создать аккаунт</Link></section>
    </div>
    <section className="admin-card admin-recent"><header><div><p className="eyebrow">Последние</p><h2>Новые книги</h2></div><Link href="/admin/books">Все книги <ArrowRight size={14} /></Link></header><div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Таблица данных — прокрутите для просмотра всех столбцов"><table className="admin-table"><thead><tr><th>Книга</th><th>Автор</th><th>Пользователь</th><th>Прогресс</th><th>Статус</th></tr></thead><tbody>{data.recentBooks.map((book) => <tr key={book.id}><td><b>{book.title}</b><small>{new Date(book.createdAt).toLocaleDateString("ru-KZ")}</small></td><td>{book.authorName}</td><td><b>{book.ownerName}</b><small>{book.ownerPhone}</small></td><td><b>{book.progress}%</b></td><td><BookStatusPill status={book.status} /></td></tr>)}</tbody></table></div></section>
  </>;
}
