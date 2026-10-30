import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";

export function WaitlistSection({ children }: { children?: ReactNode }) {
  return (
    <Section id="waitlist" labelledBy="waitlist-title">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
        <header className="max-w-xl">
          <p className="text-sm font-medium text-muted">Waitlist</p>
          <h2 id="waitlist-title" className="mt-2 text-xl font-semibold tracking-tight">
            Get one email when RepLog launches
          </h2>
          <p className="mt-4 text-base text-muted">
            Leave your address and we&apos;ll write once, on launch day. Nothing else.
          </p>
        </header>
        <div>{children}</div>
      </div>
    </Section>
  );
}
