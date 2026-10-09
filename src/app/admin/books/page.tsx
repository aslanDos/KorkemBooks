import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BookStatusSelect } from "@/components/admin/book-status-select";
import { getAdminBooksPage, type AdminBooksPageQuery } from "@/lib/admin/queries";

const PAGE_SIZE = 10;
const filters = [["all", "Все"], ["writing", "Написание"], ["editing", "Редактура"], ["approval", "Согласование"], ["printing", "Печать"], ["ready", "Готово"], ["delivery", "Доставка"], ["received", "Завершен"]] as const;
type SortKey = AdminBooksPageQuery["sort"];
type SortDirection = AdminBooksPageQuery["direction"];
type BooksSearchParams = { status?: string; q?: string; sort?: string; dir?: string; page?: string };

function booksHref(current: Required<Pick<BooksSearchParams, "status" | "q" | "sort" | "dir">>, updates: BooksSearchParams) {
  const values = { ...current, ...updates };
  const params = new URLSearchParams();
  if (values.status !== "all") params.set("status", values.status);
  if (values.q) params.set("q", values.q);
  if (values.sort !== "created") params.set("sort", values.sort);
  if (values.dir !== "desc") params.set("dir", values.dir);
  if (values.page && values.page !== "1") params.set("page", values.page);
  const query = params.toString();
  return query ? `/admin/books?${query}` : "/admin/books";
}

function sortIcon(column: SortKey, currentSort: SortKey, direction: SortDirection) {
  if (currentSort !== column) return <ArrowUpDown size={13} aria-hidden="true" />;
  return direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
}

export default async function AdminBooksPage({ searchParams }: { searchParams: Promise<BooksSearchParams> }) {
  const params = await searchParams;
  const status: AdminBooksPageQuery["status"] = filters.some(([value]) => value === params.status) ? params.status as AdminBooksPageQuery["status"] : "all";
  const q = params.q?.trim() ?? "";
  const sort: SortKey = params.sort === "title" || params.sort === "progress" || params.sort === "status" ? params.sort : "created";
  const direction: SortDirection = params.dir === "asc" ? "asc" : "desc";
  const current = { status, q, sort, dir: direction };
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safeRequestedPage = Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1);
  const query = { status, q, sort, direction, page: safeRequestedPage, pageSize: PAGE_SIZE } satisfies AdminBooksPageQuery;
  let booksPage = await getAdminBooksPage(query);
  const totalPages = Math.max(1, Math.ceil(booksPage.total / PAGE_SIZE));
  const page = Math.min(totalPages, safeRequestedPage);
  if (page !== safeRequestedPage) booksPage = await getAdminBooksPage({ ...query, page });
  const firstShown = booksPage.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, booksPage.total);
  const paginationPages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  function sortHref(key: SortKey) {
    const nextDirection: SortDirection = sort === key ? (direction === "asc" ? "desc" : "asc") : key === "created" ? "desc" : "asc";
    return booksHref(current, { sort: key, dir: nextDirection, page: "1" });
  }

  return <>
    <DashboardHeader title="Книги" description="Все книги пользователей и этапы их производства" />
    <section className="admin-card admin-list-card">
      <header><nav className="admin-tabs" aria-label="Фильтр по этапу книги">{filters.map(([value, label]) => <Link className={status === value ? "is-active" : ""} key={value} href={booksHref(current, { status: value, page: "1" })}>{label}</Link>)}</nav></header>
      <form className="admin-search"><Search size={17} /><input name="q" aria-label="Поиск" defaultValue={q} placeholder="Поиск по книге, автору, типу или пользователю" /><input type="hidden" name="status" value={status} /><input type="hidden" name="sort" value={sort} /><input type="hidden" name="dir" value={direction} /></form>
      <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Таблица данных — прокрутите для просмотра всех столбцов">
        <table className="admin-table"><thead><tr>
          <th aria-sort={sort === "title" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("title")}>Книга {sortIcon("title", sort, direction)}</Link></th>
          <th>Тип получателя</th><th>Пользователь</th>
          <th aria-sort={sort === "progress" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("progress")}>Прогресс {sortIcon("progress", sort, direction)}</Link></th>
          <th aria-sort={sort === "created" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("created")}>Создана {sortIcon("created", sort, direction)}</Link></th>
          <th aria-sort={sort === "status" ? direction === "asc" ? "ascending" : "descending" : "none"}><Link className="admin-sort-link" href={sortHref("status")}>Статус {sortIcon("status", sort, direction)}</Link></th>
        </tr></thead><tbody>{booksPage.books.map((book) => <tr key={book.id}><td><Link className="admin-book-link" href={`/admin/books/${book.id}`}>{book.title}</Link><small>Автор: {book.authorName} · Для: {book.recipientName}</small></td><td><span className="admin-assigned-type">{book.typeName}</span></td><td><b>{book.ownerPhone}</b></td><td><div className="admin-book-progress"><span><i style={{ width: `${book.progress}%` }} /></span><b>{book.progress}%</b></div></td><td>{new Date(book.createdAt).toLocaleDateString("ru-KZ")}</td><td><BookStatusSelect bookId={book.id} status={book.status} /></td></tr>)}</tbody></table>
        {booksPage.books.length === 0 && <div className="admin-table-empty"><strong>Книг не найдено</strong><span>{q ? "Попробуйте изменить поисковый запрос." : status === "all" ? "Книга появится здесь сразу после того, как пользователь создаст её в личном кабинете." : "На выбранном этапе пока нет книг."}</span></div>}
      </div>
      {booksPage.total > 0 && <footer className="admin-pagination"><p>Показано {firstShown}–{lastShown} из {booksPage.total}</p><nav aria-label="Пагинация книг"><Link className={page === 1 ? "is-disabled" : ""} href={booksHref(current, { page: String(page - 1) })} aria-disabled={page === 1} tabIndex={page === 1 ? -1 : undefined}><ChevronLeft size={15} /><span className="visually-hidden">Предыдущая страница</span></Link>{paginationPages.map((value, index) => <span key={value}>{index > 0 && value - paginationPages[index - 1] > 1 && <i>…</i>}<Link className={value === page ? "is-active" : ""} href={booksHref(current, { page: String(value) })} aria-current={value === page ? "page" : undefined}>{value}</Link></span>)}<Link className={page === totalPages ? "is-disabled" : ""} href={booksHref(current, { page: String(page + 1) })} aria-disabled={page === totalPages} tabIndex={page === totalPages ? -1 : undefined}><ChevronRight size={15} /><span className="visually-hidden">Следующая страница</span></Link></nav></footer>}
    </section>
  </>;
}
