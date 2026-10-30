import Link from "next/link";
import type { ReactNode } from "react";

/** Centered single-column layout shared by the auth pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="container-page flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-lg font-semibold tracking-tight"
        >
          RepLog
        </Link>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
        <div className="mt-8">{children}</div>
        {footer ? (
          <div className="mt-8 flex flex-col gap-1 text-sm text-muted">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg"
    >
      {children}
    </Link>
  );
}
