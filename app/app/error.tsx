"use client";

import { Button } from "@/components/ui/button";

/** Error state for /app pages. Details stay on the server. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="max-w-md py-8">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-base text-muted">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <Button variant="secondary" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
