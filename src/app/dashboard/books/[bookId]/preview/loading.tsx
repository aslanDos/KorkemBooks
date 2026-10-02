import { BookOpen } from "lucide-react";

export default function PreviewLoading() {
  return <section className="book-preview-loading" aria-live="polite" aria-busy="true">
    <BookOpen size={22} aria-hidden="true" />
    <span><strong>Подготавливаем предпросмотр</strong><small>Загружаем страницы и фотографии книги…</small></span>
  </section>;
}
