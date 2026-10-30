import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** FR30: shown on every /app page for the read-only demo account. */
export function DemoBanner() {
  return (
    <div role="note" className="border-b border-line bg-surface">
      <div className="container-page flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm">
          <span className="font-semibold">Demo is read-only</span> — sign up to log your
          own workouts.
        </p>
        <Link href="/signup" className={buttonClass("primary", "text-sm md:shrink-0")}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
