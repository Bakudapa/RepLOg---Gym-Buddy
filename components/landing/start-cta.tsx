import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { DemoButton } from "./demo-button";

/** Sign-up call to action near the end of the page (FR11). */
export function StartCta() {
  return (
    <Section id="start" labelledBy="start-title">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <header className="max-w-xl">
          <p className="text-sm font-medium text-muted">Get started</p>
          <h2 id="start-title" className="mt-2 text-xl font-semibold tracking-tight">
            Start logging your workouts — free
          </h2>
          <p className="mt-4 text-base text-muted">
            Create an account in a minute, or look around a demo account with six weeks of
            training first.
          </p>
        </header>
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <Link href="/signup" className={buttonClass("primary")}>
            Get started
          </Link>
          <DemoButton />
        </div>
      </div>
    </Section>
  );
}
