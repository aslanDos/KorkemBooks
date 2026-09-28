import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CreateBookForm } from "@/components/books/create-book-form";
import { getFirstBookId, getBookTypes } from "@/lib/books/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export default async function CreateBookPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    const bookId = await getFirstBookId();
    if (bookId) redirect(`/dashboard/books/${bookId}`);
  }
  const bookTypes = isAdmin ? await getBookTypes() : [];

  return (
    <>
      <DashboardHeader title="Новая книга" description="Первый шаг к вашей истории" />
      <section className="dashboard-section book-form-card">
        <div className="book-form-card__heading"><div><p className="eyebrow">Основные данные</p><h2>Начнём с главного</h2><p>{isAdmin ? "Укажите название, автора, тип получателя и язык книги. Имя получателя можно добавить позже." : "Укажите название книги и автора. Тип получателя и язык уже назначены вашему аккаунту. Имя получателя можно добавить позже."} Поля со звёздочкой обязательны.</p></div><Link href="/dashboard/books"><ArrowLeft size={17} />К книгам</Link></div>
        <CreateBookForm adminBookTypes={isAdmin ? bookTypes : undefined} />
      </section>
    </>
  );
}
