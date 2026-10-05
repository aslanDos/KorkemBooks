import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditBookForm } from "@/components/books/edit-book-form";
import { getBookLanguageLabel } from "@/lib/books/language";
import { getBookWithContent } from "@/lib/books/queries";

export default async function EditBookPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  const book = await getBookWithContent(bookId, "summary");
  if (!book) notFound();
  if (book.productionStatus !== "writing") redirect(`/dashboard/books/${book.id}`);

  return (
    <>
      <header className="writer-page-header">
        <Link href={`/dashboard/books/${book.id}`}><ArrowLeft size={17} />К книге</Link>
        <div>
          <strong>Редактировать книгу</strong>
        </div>
      </header>
      <section className="dashboard-section book-form-card">
        <div className="book-form-card__heading">
          <div>
            <p className="eyebrow">Данные книги</p>
            <h2>Основная информация</h2>
            <p>Название, автора и имя получателя можно изменить. Тип получателя и язык назначены менеджером и доступны только для просмотра. Поля со звёздочкой обязательны.</p>
          </div>
        </div>
        <EditBookForm
          bookId={book.id}
          title={book.title}
          authorName={book.author_name}
          recipientName={book.recipient_name}
          bookType={book.typeName}
          bookLanguage={getBookLanguageLabel(book.language)}
        />
      </section>
    </>
  );
}
