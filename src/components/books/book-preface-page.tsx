import { getBookContent } from "@/lib/books/language";
import type { BookLanguage } from "@/lib/books/types";

export function BookPrefacePage({ language = "ru" }: { language?: BookLanguage }) {
  const content = getBookContent(language);
  return (
    <div className="preview-preface-page">
      <h2>{content.prefaceTitle}</h2>
      <div className="preview-preface-page__text">
        {content.preface.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <p className="preview-preface-page__signature">{content.signature}<br />KorkemBooks</p>
    </div>
  );
}
