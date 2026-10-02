"use client";

import { useRef } from "react";
import { Download, Ruler } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export function PrintFormatButton({ bookId }: { bookId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openPrint(format: "a5" | "compact") {
    dialogRef.current?.close();
    window.open(`/admin/books/${bookId}/print?format=${format}`, "_blank", "noopener,noreferrer");
  }

  return <div className="print-format-control">
    <button className="secondary-content-button" type="button" onClick={() => dialogRef.current?.showModal()}>
      <Download size={16} aria-hidden="true" />
      Скачать PDF
    </button>
    <Dialog
      ref={dialogRef}
      className="submit-book-dialog"
      panelClassName="submit-book-dialog__panel"
      eyebrow="Печатный макет"
      title="Выберите размер книги"
    >
      <div className="submit-book-dialog__notice">
        <span><Ruler size={20} aria-hidden="true" /></span>
        <p>Размер указан после обрезки. В PDF автоматически добавятся вылеты по 2 мм с каждой стороны.</p>
      </div>
      <div className="print-format-options">
        <button type="button" onClick={() => openPrint("a5")}>
          <span><strong>A5 — 148 × 210 мм</strong><small>PDF для печати: 152 × 214 мм</small></span>
          <Download size={17} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => openPrint("compact")}>
          <span><strong>135 × 205 мм</strong><small>PDF для печати: 139 × 209 мм</small></span>
          <Download size={17} aria-hidden="true" />
        </button>
      </div>
    </Dialog>
  </div>;
}
