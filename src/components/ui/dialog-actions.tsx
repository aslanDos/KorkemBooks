"use client";

import { SubmitButton } from "@/components/ui/submit-button";

export function DialogActions({ submitLabel }: { submitLabel: string }) {
  return (
    <div className="edit-book-dialog__actions">
      <button type="button" onClick={(event) => event.currentTarget.closest("dialog")?.close()}>
        Отмена
      </button>
      <SubmitButton>{submitLabel}</SubmitButton>
    </div>
  );
}
