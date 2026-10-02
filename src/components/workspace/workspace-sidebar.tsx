"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookCopy, BookMarked, House, LayoutDashboard, ListChecks, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings, Users, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOutAction } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import type { AppRole } from "@/lib/auth/current-user";

const customerLinks = [
  { href: "/dashboard", label: "Обзор", icon: House, exact: true },
  { href: "/dashboard/books", label: "Мои книги", icon: BookMarked, exact: false },
  { href: "/dashboard/settings", label: "Настройки", icon: Settings, exact: false },
];
const adminLinks = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Пользователи", icon: Users, exact: false },
  { href: "/admin/books", label: "Книги", icon: BookCopy, exact: false },
  { href: "/admin/questions", label: "Вопросы", icon: ListChecks, exact: false },
  { href: "/admin/analytics", label: "Продажи", icon: BarChart3, exact: false },
];
const mobileQuery = "(max-width: 980px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function WorkspaceSidebar({ admin = false, role = "user", canCreateBook = false }: { admin?: boolean; role?: AppRole; canCreateBook?: boolean }) {
  const pathname = usePathname();
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia(mobileQuery).matches, () => false);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const links = admin ? adminLinks : role === "manager" ? [...customerLinks, { href: "/dashboard/users/new", label: "Создать аккаунт", icon: Users, exact: false }] : customerLinks;
  const close = () => { setOpen(false); trigger.current?.focus(); };

  useEffect(() => {
    if (!open || !mobile) return;
    const main = document.querySelector<HTMLElement>(".dashboard-main");
    const wasInert = main?.inert ?? false;
    if (main) main.inert = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
      if (event.key !== "Tab") return;
      const focusable = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      if (main) main.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
    };
  }, [open, mobile]);

  return <>
    <button ref={trigger} className="mobile-menu-button" type="button" onClick={() => setOpen(true)} aria-label="Открыть меню" aria-expanded={mobile && open} aria-controls="workspace-navigation"><Menu size={21} /></button>
    {open && mobile && <button className="sidebar-backdrop" type="button" onClick={close} tabIndex={-1} aria-label="Закрыть меню" />}
    <aside ref={sidebar} id="workspace-navigation" inert={mobile && !open} role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined} aria-label={admin ? "Навигация администратора" : "Навигация личного кабинета"} className={`dashboard-sidebar${admin ? " admin-sidebar" : ""}${open && mobile ? " dashboard-sidebar--open" : ""}${collapsed ? " dashboard-sidebar--collapsed" : ""}`}>
      <div className="dashboard-sidebar__top">
        <BrandMark collapsed={collapsed && !mobile} href="/" />
        <button className="sidebar-collapse" type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Развернуть боковое меню" : "Свернуть боковое меню"} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        <button ref={closeButton} className="sidebar-close" type="button" onClick={close} aria-label="Закрыть меню"><X size={21} /></button>
      </div>
      <p className="workspace-sidebar-label">{admin ? "Управление" : "Личный кабинет"}</p>
      {canCreateBook && !admin && <Link className="sidebar-create" href="/dashboard/books/new" onClick={() => setOpen(false)} aria-label="Создать книгу" title="Создать книгу"><Plus size={18} /><span>Создать книгу</span></Link>}
      <nav className="sidebar-nav" aria-label={admin ? "Разделы админ-панели" : "Разделы личного кабинета"}>
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} aria-label={label} title={collapsed ? label : undefined} className={`sidebar-nav__item${active ? " sidebar-nav__item--active" : ""}`}><Icon size={19} strokeWidth={1.6} /><span>{label}</span></Link>;
        })}
      </nav>
      <div className="workspace-sidebar-bottom">
        {(admin || role === "admin") && <Link href={admin ? "/dashboard" : "/admin"} className="sidebar-nav__item workspace-switch" onClick={() => setOpen(false)} aria-label={admin ? "Личный кабинет" : "Админ-панель"} title={admin ? "Личный кабинет" : "Админ-панель"}><LayoutDashboard size={18} /><span>{admin ? "Личный кабинет" : "Админ-панель"}</span></Link>}
        <form className="sidebar-signout" action={signOutAction}><button type="submit" aria-label="Выйти" title="Выйти"><LogOut size={18} /><span>Выйти</span></button></form>
      </div>
    </aside>
  </>;
}
