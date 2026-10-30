import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";

export function FeedbackCta({ action }: { action?: ReactNode }) {
  return (
    <Section id="feedback" labelledBy="feedback-title">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <header className="max-w-xl">
          <p className="text-sm font-medium text-muted">Feedback</p>
          <h2 id="feedback-title" className="mt-2 text-xl font-semibold tracking-tight">
            Tell us what to build
          </h2>
          <p className="mt-4 text-base text-muted">
            Have an idea, a critique, or found something broken on this page? We read
            every message.
          </p>
        </header>
        {action}
      </div>
    </Section>
  );
}
