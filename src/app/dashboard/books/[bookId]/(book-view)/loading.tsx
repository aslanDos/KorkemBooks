import { ListChecks } from "lucide-react";

export default function BookViewLoading() {
  return <section className="book-preview-loading" aria-live="polite" aria-busy="true">
    <ListChecks size={22} aria-hidden="true" />
    <span><strong>Загружаем вопросы</strong><small>Подготавливаем структуру и ответы книги…</small></span>
  </section>;
}
