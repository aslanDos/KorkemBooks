"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceInfoDialog } from "@/components/workspace/workspace-info-dialog";

export function WorkspaceTopbar({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const section = path.endsWith("/write") ? "Редактор" : path.endsWith("/preview") ? "Предпросмотр" : path.endsWith("/cover") ? "Обложка" : path.endsWith("/suggestions") ? "Исправления вопросов" : path.endsWith("/settings") ? "Настройки" : path.endsWith("/users/new") ? "Новый аккаунт" : path.includes("/users") ? "Пользователи" : path.includes("/analytics") ? "Продажи" : path.endsWith("/books/new") ? "Новая книга" : path.includes("/books/") ? "Структура книги" : path.endsWith("/books") ? "Мои книги" : "Обзор";
  return <div className="workspace-topbar">
    <nav aria-label="Путь к странице"><Link href={admin ? "/admin" : "/dashboard"}>{admin ? "Админ-панель" : "Личный кабинет"}</Link><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{admin && section === "Мои книги" ? "Книги" : section}</span></nav>
    <div className="workspace-topbar__actions"><WorkspaceInfoDialog /><ThemeToggle /></div>
  </div>;
}
