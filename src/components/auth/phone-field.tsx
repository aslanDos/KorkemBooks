"use client";

import { useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { formatPhoneInput } from "@/lib/auth/phone";

type PhoneFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "value" | "defaultValue" | "onChange"> & {
  label: string;
  hint?: ReactNode;
  defaultValue?: string;
};

export function PhoneField({ label, hint, id, defaultValue = "", ...inputProps }: PhoneFieldProps) {
  const [value, setValue] = useState(() => formatPhoneInput(defaultValue));

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace" && event.key !== "Delete") return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? start;
    if (start !== end) return;

    const direction = event.key === "Backspace" ? -1 : 1;
    let digitIndex = event.key === "Backspace" ? start - 1 : start;
    while (digitIndex >= 0 && digitIndex < value.length && !/\d/.test(value[digitIndex])) {
      digitIndex += direction;
    }
    if (digitIndex < 0 || digitIndex >= value.length) return;

    event.preventDefault();
    setValue(formatPhoneInput(value.slice(0, digitIndex) + value.slice(digitIndex + 1)));
  }

  return (
    <div className="form-field">
      <div className="form-field__header"><label htmlFor={id}>{label}</label>{hint}</div>
      <div className="form-field__control">
        <input
          {...inputProps}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={18}
          placeholder="+7 (___) ___-__-__"
          value={value}
          onChange={(event) => setValue(formatPhoneInput(event.target.value))}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}
