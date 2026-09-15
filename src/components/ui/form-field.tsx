import type { InputHTMLAttributes, ReactNode } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  trailingAction?: ReactNode;
};

export function FormField({ label, hint, trailingAction, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="form-field">
      <div className="form-field__header"><label htmlFor={id}>{label}{inputProps.required && <span aria-hidden="true"> *</span>}</label>{hint}</div>
      <div className="form-field__control"><input id={id} {...inputProps} />{trailingAction}</div>
    </div>
  );
}
