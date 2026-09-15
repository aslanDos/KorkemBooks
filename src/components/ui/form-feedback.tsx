import { AlertCircle } from "lucide-react";

export function FormFeedback({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <p className="auth-feedback" role="alert">
      <AlertCircle size={17} aria-hidden="true" />
      {error}
    </p>
  );
}
