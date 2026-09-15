import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FormFeedback } from "@/components/ui/form-feedback";
import { CreateBookForm } from "@/components/books/create-book-form";
import { getBooks, getBookTypes } from "@/lib/books/queries";
import { redirect } from "next/navigation";

export default async function CreateBookPage() {
  const [books, bookTypes] = await Promise.all([getBooks(1), getBookTypes()]);
  if (books[0]) redirect(`/dashboard/books/${books[0].id}`);

  return (
    <>
      <DashboardHeader title="Новая книга" description="Первый шаг к вашей истории" />
      <section className="dashboard-section book-form-card">
        <div className="book-form-card__heading"><div><p className="eyebrow">Основные данные</p><h2>Начнём с главного</h2><p>Укажите название книги и автора. Имя получателя можно добавить позже. Поля со звёздочкой обязательны.</p></div><Link href="/dashboard/books"><ArrowLeft size={17} />К книгам</Link></div>
        {bookTypes.length > 0 ? <CreateBookForm bookTypes={bookTypes} /> : <FormFeedback error="Сначала примените миграцию books в Supabase" />}
      </section>
    </>
  );
}
