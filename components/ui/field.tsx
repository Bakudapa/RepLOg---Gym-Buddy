import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass = (invalid?: boolean) =>
  cn(
    "min-h-11 w-full rounded-md border bg-surface px-3 py-2 text-base text-fg placeholder:text-muted",
    invalid ? "border-fg" : "border-line-strong",
  );

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

/** Label + control + hint/error. The control should reference `describedBy(id, …)`. */
export function Field({ id, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-fg">
      <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** IDs for aria-describedby: the error when present, otherwise the hint. */
export function describedBy(id: string, error?: string, hasHint?: boolean) {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}
