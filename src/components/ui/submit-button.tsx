"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = Omit<ComponentProps<"button">, "type"> & {
  pendingLabel?: ReactNode;
};

export function SubmitButton({
  children,
  pendingLabel = "Подождите…",
  className = "primary-button",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button {...props} className={className} type="submit" disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
