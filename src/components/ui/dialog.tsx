"use client";

import { useId, type DialogHTMLAttributes, type Ref } from "react";
import { X } from "lucide-react";

type DialogProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, "title"> & {
  ref?: Ref<HTMLDialogElement>;
  panelClassName: string;
  title?: string;
  eyebrow?: string;
  closeIconSize?: number;
  closeDisabled?: boolean;
};

export function Dialog({
  ref,
  panelClassName,
  title,
  eyebrow,
  closeIconSize = 20,
  closeDisabled = false,
  children,
  onClick,
  ...props
}: DialogProps) {
  const titleId = useId();

  return (
    <dialog
      {...props}
      ref={ref}
      aria-labelledby={title ? titleId : props["aria-labelledby"]}
      onClick={(event) => {
        onClick?.(event);
        if (!closeDisabled && !event.defaultPrevented && event.target === event.currentTarget) {
          event.currentTarget.close();
        }
      }}
    >
      <div className={panelClassName}>
        {title && (
          <header>
            <div>
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h2 id={titleId}>{title}</h2>
            </div>
            <button
              type="button"
              aria-label="Закрыть"
              disabled={closeDisabled}
              onClick={(event) => event.currentTarget.closest("dialog")?.close()}
            >
              <X size={closeIconSize} aria-hidden="true" />
            </button>
          </header>
        )}
        {children}
      </div>
    </dialog>
  );
}
