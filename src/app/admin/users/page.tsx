import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getAdminUsersPage, type AdminUsersPageQuery } from "@/lib/admin/queries";
import type { AppRole } from "@/lib/auth/current-user";
import { InvitationLinkButton } from "@/components/admin/invitation-link-button";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { AssignBookTypeForm } from "@/components/admin/assign-book-type-form";
import { formatPhone } from "@/lib/auth/phone";
import { getBookTypes } from "@/lib/books/queries";

const PAGE_SIZE = 10;
const roleNames: Record<AppRole, string> = { admin: "Администратор", manager: "Менеджер", user: "Пользователь" };
const roleFilters = [["all", "Все"], ["user", "Пользователи"], ["manager", "Менеджеры"], ["admin", "Администраторы"]] as const;
const statusFilters = [["all", "Все статусы"], ["active", "Активированные"], ["inactive", "Не активированные"]] as const;
type SortKey = "phone" | "role" | "created" | "status";
type SortDirection = "asc" | "desc";
type UsersSearchParams = { role?: string; status?: string; q?: string; sort?: string; dir?: string; page?: string };

function usersHref(current: Required<Pick<UsersSearchParams, "role" | "status" | "q" | "sort" | "dir">>, updates: UsersSearchParams) {
  const values = { ...current, ...updates };
  const params = new URLSearchParams();
  if (values.role !== "all") params.set("role", values.role);
  if (values.status !== "all") params.set("status", values.status);
  if (values.q) params.set("q", values.q);
  if (values.sort !== "created") params.set("sort", values.sort);
  if (values.dir !== "desc") params.set("dir", values.dir);
  if (values.page && values.page !== "1") params.set("page", values.page);
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

function sortIcon(column: SortKey, currentSort: SortKey, direction: SortDirection) {
  if (currentSort !== column) return <ArrowUpDown size={13} aria-hidden="true" />;
  return direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<UsersSearchParams> }) {
  const params = await searchParams;
  const role: AdminUsersPageQuery["role"] = roleFilters.some(([value]) => value === params.role) ? params.role as AdminUsersPageQuery["role"] : "all";
  const status: AdminUsersPageQuery["status"] = statusFilters.some(([value]) => value === params.status) ? params.status as AdminUsersPageQuery["status"] : "all";
  const q = params.q?.trim() ?? "";
  const sort: SortKey = params.sort === "phone" || params.sort === "role" || params.sort === "status" ? params.sort : "created";
  const direction: SortDirection = params.dir === "asc" ? "asc" : "desc";
  const current = { role, status, q, sort, dir: direction };
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safeRequestedPage = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);
  const query = { role, status, q, sort, direction, page: safeRequestedPage, pageSize: PAGE_SIZE } satisfies AdminUsersPageQuery;
  const [initialUsersPage, bookTypes] = await Promise.all([getAdminUsersPage(query), getBookTypes()]);
  let usersPage = initialUsersPage;
  const totalPages = Math.max(1, Math.ceil(usersPage.total / PAGE_SIZE));
  const page = Math.min(totalPages, safeRequestedPage);
  if (page !== safeRequestedPage) usersPage = await getAdminUsersPage({ ...query, page });
  const users = usersPage.users;
  const firstShown = usersPage.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, usersPage.total);
  const paginationPages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  function sortHref(key: SortKey) {
    const nextDirection: SortDirection = sort === key ? (direction === "asc" ? "desc" : "asc") : key === "created" ? "desc" : "asc";
    return usersHref(current, { sort: key, dir: nextDirection, page: "1" });
  }

  return <>
    <DashboardHeader title="Пользователи" description="Управление аккаунтами и ролями в системе" />
    <section className="admin-card admin-list-card">
      <header><nav className="admin-tabs" aria-label="Фильтр по роли">{roleFilters.map(([value, label]) => <Link className={role === value ? "is-active" : ""} key={value} href={usersHref(current, { role: value, page: "1" })}>{label}</Link>)}</nav><Link className="content-primary-button" href="/admin/users/new"><Plus size={17} />Создать аккаунт</Link></header>
      <div className="admin-user-toolbar">
        <form className="admin-search"><Search size={17} /><input name="q" aria-label="Поиск" defaultValue={q} placeholder="Поиск по телефону" /><input type="hidden" name="role" value={role} /><input type="hidden" name="status" value={status} /><input type="hidden" name="sort" value={sort} /><input type="hidden" name="dir" value={direction} /></form>
        <nav className="admin-status-filters" aria-label="Фильтр по статусу аккаунта">{statusFilters.map(([value, label]) => <Link className={status === value ? "is-active" : ""} key={value} href={usersHref(current, { status: value, page: "1" })}>{label}</Link>)}</nav>
      </div>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Таблица данных — прокрутите для просмотра всех столбцов">
        <table className="admin-table"><thead><tr>
          <th aria-sort={sort === "phone" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("phone")}>Пользователь {sortIcon("phone", sort, direction)}</Link></th>
          <th aria-sort={sort === "role" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("role")}>Роль {sortIcon("role", sort, direction)}</Link></th>
          <th aria-sort={sort === "created" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("created")}>Дата регистрации {sortIcon("created", sort, direction)}</Link></th>
          <th aria-sort={sort === "status" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("status")}>Статус аккаунта {sortIcon("status", sort, direction)}</Link></th>
          <th>Доступ</th>
        </tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="admin-user-cell"><b>{user.phone ? formatPhone(user.phone) : "Телефон не указан"}</b></div></td><td><span className={`role-pill role-pill--${user.role}`}>{roleNames[user.role]}</span></td><td>{new Date(user.createdAt).toLocaleDateString("ru-KZ", { day: "numeric", month: "long", year: "numeric" })}</td><td><span className={`account-status account-status--${user.activated ? "active" : "inactive"}`}>{user.activated ? "Активирован" : "Не активирован"}</span></td><td><div className="admin-access-actions">{user.activated ? <ResetPasswordButton userId={user.id} phone={user.phone} /> : <InvitationLinkButton userId={user.id} phone={user.phone} />}{user.role === "user" && !user.hasBookType && <AssignBookTypeForm userId={user.id} bookTypes={bookTypes} />}</div></td></tr>)}</tbody></table>
        {users.length === 0 && <p className="admin-empty">Ничего не найдено</p>}
      </div>
      {usersPage.total > 0 && <footer className="admin-pagination"><p>Показано {firstShown}–{lastShown} из {usersPage.total}</p><nav aria-label="Пагинация пользователей"><Link className={page === 1 ? "is-disabled" : ""} href={usersHref(current, { page: String(page - 1) })} aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined}><ChevronLeft size={15} /><span className="visually-hidden">Предыдущая страница</span></Link>{paginationPages.map((value, index) => <span key={value}>{index > 0 && value - paginationPages[index - 1] > 1 && <i>…</i>}<Link className={value === page ? "is-active" : ""} href={usersHref(current, { page: String(value) })} aria-current={value === page ? "page" : undefined}>{value}</Link></span>)}<Link className={page === totalPages ? "is-disabled" : ""} href={usersHref(current, { page: String(page + 1) })} aria-disabled={page === totalPages} tabIndex={page === totalPages ? -1 : undefined}><ChevronRight size={15} /><span className="visually-hidden">Следующая страница</span></Link></nav></footer>}
    </section>
  </>;
}
