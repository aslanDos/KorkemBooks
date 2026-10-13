import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CreateBookForm } from "@/components/books/create-book-form";
import { getAvailableBookEntitlements, getBookTypes } from "@/lib/books/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function CreateBookPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const [bookTypes, entitlements] = await Promise.all([
    isAdmin ? getBookTypes() : Promise.resolve([]),
    isAdmin ? Promise.resolve([]) : getAvailableBookEntitlements(),
  ]);

  return (
    <>
      <DashboardHeader title="Новая книга" description="Первый шаг к вашей истории" />
      <Link className="admin-back" href="/dashboard/books"><ArrowLeft size={15} />К книгам</Link>
      <section className="dashboard-section book-form-card">
        <div className="book-form-card__heading"><div><p className="eyebrow">Основные данные</p><h2>Начнём с главного</h2><p>{isAdmin ? "Укажите название, автора, тип получателя и язык книги. Имя получателя можно добавить позже." : "Укажите название книги и автора. Имя получателя можно добавить позже."} Поля со звёздочкой обязательны.</p></div></div>
        {!isAdmin && entitlements.length === 0
          ? <div className="empty-books"><h3>Нет доступной новой книги</h3><p>Все выданные книги уже созданы. Чтобы начать ещё одну, обратитесь к нашей команде.</p></div>
          : <CreateBookForm adminBookTypes={isAdmin ? bookTypes : undefined} entitlements={isAdmin ? undefined : entitlements} />}
      </section>
    </>
  );
}
