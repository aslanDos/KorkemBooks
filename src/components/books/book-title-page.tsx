import type { BookTitlePageTitleSize } from "@/lib/books/types";

export function BookTitlePage({ authorName, title, titleSize }: { authorName: string; title: string; titleSize: BookTitlePageTitleSize }) {
  const publicationYear = new Date().getFullYear();

  return (
    <div className={`preview-title-page preview-title-page--title-size-${titleSize}`} data-no-translate>
      <p className="preview-title-page__author">{authorName}</p>
      <h1>{title}</h1>
      <div className="preview-title-page__imprint">
        <p>KorkemBooks</p>
        <time dateTime={String(publicationYear)}>{publicationYear}</time>
      </div>
    </div>
  );
}
