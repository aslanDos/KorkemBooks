import type { CSSProperties } from "react";
import type { BookPageBackground, BookTextPage as BookTextPageData } from "@/lib/books/types";
import { getPageBackgroundColor } from "@/lib/books/cover-palettes";

export function BookTextPage({ page, background = page.pageBackground }: { page: BookTextPageData; background?: BookPageBackground }) {
  const empty = !page.content.trim();
  const density = page.content.length > 700 ? "dense" : page.content.length > 350 ? "compact" : "regular";
  const style = { background: getPageBackgroundColor(background), "--text-page-size": `${page.fontSize}px` } as CSSProperties;
  return <div
    className={`preview-text-page preview-text-page--${page.style} preview-text-page--${density} preview-page-background--colored`}
    style={style}
  >
    <div className="preview-text-page__content">
      {page.style === "quote" && <span className="preview-text-page__mark" aria-hidden="true">“</span>}
      <p className={empty ? "is-placeholder" : undefined}>{empty ? "Ваша цитата или важная мысль" : page.content}</p>
      {page.style === "quote" && page.attribution.trim() && <cite>{page.attribution}</cite>}
    </div>
  </div>;
}
