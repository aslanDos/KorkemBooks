import type { ReactNode } from "react";

// The outer sheet includes bleed; the inner page keeps the original A5 layout.
export function PrintBookSheet({ children, className = "", background = "#FFFFFF", ariaLabel, printMode = "color", pageNumber }: {
  children: ReactNode;
  className?: string;
  background?: string;
  ariaLabel?: string;
  printMode?: "color" | "monochrome";
  pageNumber?: number;
}) {
  return <div className="print-book-sheet" style={{ backgroundColor: background }} data-print-mode={printMode} data-page-number={pageNumber}>
    <div className={`print-preview-page preview-page ${className}`} aria-label={ariaLabel}>
      {children}
    </div>
  </div>;
}
