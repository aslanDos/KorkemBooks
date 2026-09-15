import { formatPrintPageRanges, type BookPrintLayout } from "@/lib/books/print-layout";

export function BookPrintStats({ layout }: { layout: BookPrintLayout }) {
  return <section className="book-print-stats" aria-label="Страницы для печати">
    <dl>
      <div><dt>Цветные страницы</dt><dd data-print-count="color">{layout.colorPages.length}</dd></div>
      <div><dt>Ч/Б страницы</dt><dd data-print-count="monochrome">{layout.monochromePages.length}</dd></div>
      <div><dt>Всего страниц</dt><dd data-print-count="total">{layout.totalPages}</dd></div>
    </dl>
    <p>Ч/Б — страницы с вопросами и ответами, включая продолжения. Остальные — цветные. Обложка не учитывается.</p>
    <details><summary>Номера страниц для печати</summary>
      <p>Цветные: <span data-print-ranges="color">{formatPrintPageRanges(layout.colorPages) || "Нет"}</span></p>
      <p>Ч/Б: <span data-print-ranges="monochrome">{formatPrintPageRanges(layout.monochromePages) || "Нет"}</span></p>
      <p>Это номера листов PDF, начиная с первой пустой страницы. Для раздельной печати используйте эти диапазоны в двух заданиях: цветном и чёрно-белом.</p>
    </details>
  </section>;
}
