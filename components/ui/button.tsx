import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-medium transition-colors duration-200 ease-standard disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line-strong bg-transparent text-fg hover:bg-surface",
  ghost: "bg-transparent text-fg hover:bg-surface",
};

/** Shared classes so links can look like buttons without duplicating styles. */
export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
