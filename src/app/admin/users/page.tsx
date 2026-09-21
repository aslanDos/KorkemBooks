import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getAdminUsers } from "@/lib/admin/queries";
import type { AppRole } from "@/lib/auth/current-user";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { AssignBookTypeForm } from "@/components/admin/assign-book-type-form";
import { formatPhone } from "@/lib/auth/phone";
import { getBookTypes } from "@/lib/books/queries";

const roleNames: Record<AppRole, string> = { admin: "Администратор", manager: "Менеджер", user: "Пользователь" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const { role = "all", q = "" } = await searchParams;
  const [allUsers, bookTypes] = await Promise.all([getAdminUsers(), getBookTypes()]);
  const users = allUsers.filter((user) => (role === "all" || user.role === role) && (!q || (user.phone ?? "").toLowerCase().includes(q.toLowerCase())));
  return <>
    <DashboardHeader title="Пользователи" description="Управление аккаунтами и ролями в системе" />
    <section className="admin-card admin-list-card">
      <header><nav className="admin-tabs">{[["all", "Все"], ["user", "Пользователи"], ["manager", "Менеджеры"], ["admin", "Администраторы"]].map(([value, label]) => <Link className={role === value ? "is-active" : ""} key={value} href={`/admin/users?role=${value}`}>{label}</Link>)}</nav><Link className="content-primary-button" href="/admin/users/new"><Plus size={17} />Создать аккаунт</Link></header>
      <form className="admin-search"><Search size={17} /><input name="q" aria-label="Поиск" defaultValue={q} placeholder="Поиск по телефону" /><input type="hidden" name="role" value={role} /></form>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Таблица данных — прокрутите для просмотра всех столбцов"><table className="admin-table"><thead><tr><th>Пользователь</th><th>Роль</th><th>Дата регистрации</th><th>Доступ</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="admin-user-cell"><span>{user.phone?.slice(-2) ?? "—"}</span><div><b>{user.phone ? formatPhone(user.phone) : "Телефон не указан"}</b></div></div></td><td><span className={`role-pill role-pill--${user.role}`}>{roleNames[user.role]}</span></td><td>{new Date(user.createdAt).toLocaleDateString("ru-KZ", { day: "numeric", month: "long", year: "numeric" })}</td><td><div className="admin-access-actions"><ResetPasswordButton userId={user.id} phone={user.phone} />{user.role === "user" && !user.hasBookType && <AssignBookTypeForm userId={user.id} bookTypes={bookTypes} />}</div></td></tr>)}</tbody></table>{users.length === 0 && <p className="admin-empty">Ничего не найдено</p>}</div>
    </section>
  </>;
}
