"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { demoLogin } from "@/app/(auth)/actions";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** "Try the demo" (FR30): logs in to the read-only demo account. */
export function DemoButton({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(demoLogin, {});
  return (
    <form action={action} className={cn("flex flex-col gap-2", className)}>
      <button
        type="submit"
        disabled={pending}
        className={buttonClass("secondary", "w-full md:w-auto")}
      >
        {pending ? (
          <LoaderCircle
            aria-hidden
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Opening demo…" : "Try the demo"}
      </button>
      <p role="status" aria-live="polite" className="text-sm font-medium empty:hidden">
        {state.error ?? ""}
      </p>
    </form>
  );
}
