"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, inputClass } from "@/components/ui/field";
import { postJson } from "@/lib/api-client";
import { formatRetryMinutes } from "@/lib/rate-limit";
import { fieldErrors, waitlistSchema } from "@/lib/validation/schemas";
import { useWaitlistCount } from "./waitlist-context";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "already" }
  | { kind: "error"; message: string };

export function WaitlistForm() {
  const id = useId();
  const emailId = `${id}-email`;
  const errorId = `${id}-email-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const { increment } = useWaitlistCount();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "loading") return;

    const parsed = waitlistSchema.safeParse({ email, website });
    if (!parsed.success) {
      setFieldError(fieldErrors<"email">(parsed.error).email);
      setStatus({ kind: "idle" });
      inputRef.current?.focus();
      return;
    }

    setFieldError(undefined);
    setStatus({ kind: "loading" });
    const result = await postJson("/api/waitlist", parsed.data);

    if (result.ok) {
      increment();
      setStatus({ kind: "success" });
      return;
    }
    switch (result.status) {
      case 409:
        setStatus({ kind: "already" });
        return;
      case 400:
        setFieldError(
          result.error?.fields?.email ?? "Please enter a valid email address.",
        );
        setStatus({ kind: "idle" });
        inputRef.current?.focus();
        return;
      case 429:
        setStatus({
          kind: "error",
          message: `Too many attempts. Please try again in ${formatRetryMinutes(result.retryAfterSeconds ?? 60)}.`,
        });
        return;
      default:
        setStatus({ kind: "error", message: "Something went wrong. Please try again." });
    }
  }

  if (status.kind === "success" || status.kind === "already") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 border-t border-line-strong pt-6"
      >
        <Check aria-hidden size={20} className="mt-0.5 shrink-0" />
        <p className="text-base">
          {status.kind === "success"
            ? "You're on the list! We'll let you know when RepLog launches."
            : "You're already on the list."}
        </p>
      </div>
    );
  }

  const loading = status.kind === "loading";

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Join the waitlist"
      className="relative"
    >
      <label htmlFor={emailId} className="block text-sm font-medium">
        Email
      </label>
      <div className="mt-2 flex flex-col gap-3 md:flex-row">
        <input
          ref={inputRef}
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="you@example.com"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(fieldError) || undefined}
          aria-describedby={fieldError ? errorId : undefined}
          className={inputClass(Boolean(fieldError))}
        />
        <Button
          type="submit"
          disabled={loading}
          aria-disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <LoaderCircle
              aria-hidden
              size={18}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : null}
          {loading ? "Joining…" : "Join the waitlist"}
        </Button>
      </div>
      <FieldError id={errorId} message={fieldError} />

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-3 text-sm font-medium empty:hidden"
      >
        {status.kind === "error" ? status.message : ""}
      </p>
    </form>
  );
}
