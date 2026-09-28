"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField } from "@/components/ui/form-field";

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: React.ReactNode;
};

export function PasswordField({ id, label, autoComplete, hint }: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField
      id={id} name={id} label={label} type={isVisible ? "text" : "password"}
      autoComplete={autoComplete} placeholder={autoComplete === "current-password" ? "Введите текущий пароль" : "Минимум 8 символов"} minLength={autoComplete === "new-password" ? 8 : undefined} required hint={hint}
      trailingAction={
        <button className="password-toggle" type="button" onClick={() => setIsVisible((value) => !value)} aria-label={isVisible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={isVisible}>
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
    />
  );
}
