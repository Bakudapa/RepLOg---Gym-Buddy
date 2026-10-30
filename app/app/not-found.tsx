import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/** Unknown ids and other users' data both end up here (FR27). */
export default function AppNotFound() {
  return (
    <div className="max-w-md py-8">
      <p className="num text-sm text-muted">404</p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Not found</h1>
      <p className="mt-2 text-base text-muted">
        This workout or page doesn&apos;t exist.
      </p>
      <Link href="/app" className={buttonClass("secondary", "mt-6")}>
        Back to dashboard
      </Link>
    </div>
  );
}
