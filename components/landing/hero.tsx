import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { DemoButton } from "./demo-button";
import { PhoneMockup } from "./phone-mockup";

export function Hero({ counter }: { counter?: ReactNode }) {
  return (
    <section id="top" aria-labelledby="hero-title">
      <div className="container-page grid gap-12 pt-12 pb-20 md:pt-16 md:pb-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="max-w-2xl">
          <p className="inline-flex items-center rounded-sm border border-line-strong px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
            100% free
          </p>
          <h1 id="hero-title" className="mt-6 text-display font-semibold tracking-tight">
            A gym log for sets, reps, and weight.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Write down each set in a couple of taps. RepLog keeps your history, spots new
            personal records, and charts how every lift moves over time.
          </p>
          <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-start">
            <Link href="/signup" className={buttonClass("primary")}>
              Get started — it&apos;s free
            </Link>
            <DemoButton />
          </div>
          {counter ? <div className="mt-6">{counter}</div> : null}
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}
