import type { CSSProperties } from "react";
import type { BookWithContent } from "@/lib/books/types";
import { COVER_PALETTES } from "@/lib/books/cover-palettes";

export function BookCoverThumbnail({ book }: { book: BookWithContent }) {
  const cover = book.cover;
  const palette = COVER_PALETTES.find(item => item.key === cover?.colorKey) ?? COVER_PALETTES.find(item => item.key === "burgundy") ?? COVER_PALETTES[0];
  const template = cover?.style === "template";
  const background = template ? cover.customBackgroundUrl ?? cover.template.backgroundPath : null;
  return (
    <div className={`book-cover-thumbnail${template ? " book-cover-thumbnail--template" : ""}${template && cover.backgroundInsideFrame && cover.showFrame ? " book-cover-thumbnail--background-inside-frame" : ""} book-cover-thumbnail--frame-${cover?.frameStyle ?? "ver2"}${cover?.showFrame === false ? " book-cover-thumbnail--no-frame" : ""}`} style={{ "--thumbnail-bg": palette.background, "--thumbnail-detail": cover?.frameColor ?? palette.detail, "--thumbnail-image": background ? `url(${JSON.stringify(background)})` : "none", "--thumbnail-title-size": `${(cover?.titleSize ?? 24) * .75}px`, "--thumbnail-author-size": `${(cover?.authorSize ?? 10) * .8}px` } as CSSProperties} aria-hidden="true">
      {background && <span className="book-cover-thumbnail__background" />}
      <span className="book-cover-thumbnail__frame" />
      <div className="book-cover-thumbnail__title"><strong>{book.title}</strong>{cover?.showAuthor !== false && <span>{book.author_name}</span>}</div>
    </div>
  );
}
