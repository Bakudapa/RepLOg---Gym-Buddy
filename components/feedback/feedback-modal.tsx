"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import { postJson } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatRetryMinutes } from "@/lib/rate-limit";
import {
  feedbackSchema,
  fieldErrors,
  type FeedbackCategory,
  type FieldErrors,
} from "@/lib/validation/schemas";

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "feature", label: "Feature idea" },
  { value: "critique", label: "Critique" },
  { value: "bug", label: "Bug report" },
];

const MAX_MESSAGE = 1000;

type FieldName = "category" | "message" | "email";
type Status = "idle" | "loading" | "success";

const emptyForm = {
  category: "" as FeedbackCategory | "",
  message: "",
  email: "",
  website: "",
};

type FeedbackModalProps = { open: boolean; onClose: () => void };

/**
 * Feedback form in a native <dialog> (FR10). showModal() makes the rest of the page
 * inert, which keeps Tab focus inside. Bottom sheet on phones, centered dialog from md up.
 */
export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const focusBeforeConfirmRef = useRef<HTMLElement | null>(null);
  const closeAfterSuccessRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string>();
  const [confirming, setConfirming] = useState(false);

  const dirty =
    status !== "success" &&
    (form.category !== "" || form.message.trim() !== "" || form.email.trim() !== "");
  const messageLength = form.message.trim().length;

  // Open/close the native dialog and lock page scroll while it is open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (!open) document.documentElement.style.overflow = "";
    };
  }, [open]);

  const restoreFocusPending = useRef(false);

  useEffect(() => {
    if (confirming) {
      keepEditingRef.current?.focus();
      return;
    }
    if (!restoreFocusPending.current) return;
    restoreFocusPending.current = false;
    // The form has re-mounted; put focus back where the user was.
    const previousId = focusBeforeConfirmRef.current?.id;
    const target =
      (previousId ? document.getElementById(previousId) : null) ??
      dialogRef.current?.querySelector("textarea");
    target?.focus();
  }, [confirming]);

  function cancelConfirm() {
    restoreFocusPending.current = true;
    setConfirming(false);
  }

  /** Keeps Tab and Shift+Tab inside the dialog instead of escaping to the browser UI. */
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([tabindex="-1"]):not([disabled]), textarea:not([disabled]), [href]',
      ),
    ).filter(
      (element) =>
        element.offsetParent !== null || element.matches("input[type=radio]:checked"),
    );
    // Radio groups take one tab stop: the checked radio, or the first one.
    const stops = focusable.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== "radio") return true;
      const group = focusable.filter(
        (other): other is HTMLInputElement =>
          other instanceof HTMLInputElement && other.name === element.name,
      );
      const checked = group.find((radio) => radio.checked);
      return checked ? element === checked : element === group[0];
    });
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !dialogRef.current.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    if (status === "success") closeAfterSuccessRef.current?.focus();
  }, [status]);

  function finishClose() {
    document.documentElement.style.overflow = "";
    setConfirming(false);
    if (status === "success") {
      setForm(emptyForm);
      setErrors({});
      setSubmitted(false);
      setStatus("idle");
    }
    setFormError(undefined);
    onClose();
  }

  /** Every close path (Esc, X, backdrop) comes through here. */
  function requestClose() {
    if (status === "loading") return;
    if (dirty) {
      focusBeforeConfirmRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setConfirming(true);
      return;
    }
    finishClose();
  }

  function discard() {
    setForm(emptyForm);
    setErrors({});
    setSubmitted(false);
    setStatus("idle");
    setConfirming(false);
    setFormError(undefined);
    document.documentElement.style.overflow = "";
    onClose();
  }

  function validate(next: typeof form) {
    const parsed = feedbackSchema.safeParse(next);
    return parsed.success
      ? { ok: true as const, data: parsed.data }
      : { ok: false as const, errors: fieldErrors<FieldName>(parsed.error) };
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    // After the first submit attempt, keep errors in sync while the user fixes them.
    if (submitted) {
      const result = validate(next);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setSubmitted(true);
    setFormError(undefined);

    const result = validate(form);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["category", "message", "email"] as const).find(
        (field) => result.errors[field],
      );
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }

    setErrors({});
    setStatus("loading");
    const response = await postJson("/api/feedback", {
      ...result.data,
      website: form.website,
    });
    if (response.ok) {
      setStatus("success");
      return;
    }
    setStatus("idle");
    if (response.status === 400 && response.error?.fields) {
      setErrors(response.error.fields as FieldErrors<FieldName>);
    } else if (response.status === 429) {
      setFormError(
        `Too many attempts. Please try again in ${formatRetryMinutes(response.retryAfterSeconds ?? 60)}.`,
      );
    } else {
      setFormError("Something went wrong. Please try again.");
    }
  }

  const titleId = `${id}-title`;
  const messageHintId = `${id}-message-count`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="modal fixed inset-x-0 top-auto bottom-0 m-0 max-h-[calc(100dvh-env(safe-area-inset-top)-1rem)] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-lg border border-b-0 border-line-strong bg-bg p-0 text-fg backdrop:bg-overlay md:inset-0 md:m-auto md:max-h-[calc(100dvh-4rem)] md:w-[min(32rem,calc(100%-4rem))] md:rounded-lg md:border-b"
      onCancel={(event) => {
        // Esc: route through the same close logic so unsaved text is protected.
        event.preventDefault();
        if (confirming) cancelConfirm();
        else requestClose();
      }}
      onKeyDown={trapFocus}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a backdrop click.
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6 md:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Send feedback
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ideas, critique, and bug reports all help.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg transition-colors duration-200 hover:bg-surface"
          >
            <X aria-hidden size={20} />
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-8">
            <p role="status" className="flex items-start gap-3 text-base">
              <Check aria-hidden size={20} className="mt-0.5 shrink-0" />
              Thanks for the feedback. We read every message.
            </p>
            <Button
              ref={closeAfterSuccessRef}
              variant="secondary"
              onClick={finishClose}
              className="mt-8 w-full md:w-auto"
            >
              Close
            </Button>
          </div>
        ) : confirming ? (
          <div role="alertdialog" aria-labelledby={`${id}-confirm`} className="mt-8">
            <p id={`${id}-confirm`} className="text-base font-semibold">
              Discard your message?
            </p>
            <p className="mt-2 text-sm text-muted">What you wrote will be lost.</p>
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <Button ref={keepEditingRef} variant="secondary" onClick={cancelConfirm}>
                Keep editing
              </Button>
              <Button variant="ghost" onClick={discard} className="border border-line">
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
            <fieldset
              aria-describedby={errors.category ? `${id}-category-error` : undefined}
              aria-invalid={Boolean(errors.category) || undefined}
            >
              <legend className="text-sm font-medium">Category</legend>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                {CATEGORIES.map((category, index) => (
                  <label key={category.value} className="relative">
                    <input
                      id={index === 0 ? `${id}-category` : undefined}
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={form.category === category.value}
                      onChange={() => update("category", category.value)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
                        form.category === category.value
                          ? "border-fg bg-fg text-bg"
                          : "border-line-strong hover:bg-surface",
                      )}
                    >
                      {category.label}
                    </span>
                  </label>
                ))}
              </div>
              <FieldError id={`${id}-category-error`} message={errors.category} />
            </fieldset>

            <div>
              <div className="flex items-baseline justify-between gap-4">
                <label htmlFor={`${id}-message`} className="text-sm font-medium">
                  Message
                </label>
                <span
                  id={messageHintId}
                  className={cn(
                    "num text-xs",
                    messageLength > MAX_MESSAGE ? "font-semibold text-fg" : "text-muted",
                  )}
                >
                  {messageLength}/{MAX_MESSAGE}
                  <span className="sr-only"> characters</span>
                </span>
              </div>
              <textarea
                id={`${id}-message`}
                rows={5}
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                aria-invalid={Boolean(errors.message) || undefined}
                aria-describedby={[
                  describedBy(`${id}-message`, errors.message),
                  messageHintId,
                ]
                  .filter(Boolean)
                  .join(" ")}
                placeholder="What should we build, change, or fix?"
                className={cn(
                  inputClass(Boolean(errors.message)),
                  "mt-2 min-h-32 resize-y",
                )}
              />
              <FieldError id={`${id}-message-error`} message={errors.message} />
            </div>

            <div>
              <label htmlFor={`${id}-email`} className="block text-sm font-medium">
                Email{" "}
                <span className="font-normal text-muted">
                  (optional, if you want a reply)
                </span>
              </label>
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                aria-invalid={Boolean(errors.email) || undefined}
                aria-describedby={describedBy(`${id}-email`, errors.email)}
                className={cn(inputClass(Boolean(errors.email)), "mt-2")}
              />
              <FieldError id={`${id}-email-error`} message={errors.email} />
            </div>

            {/* Honeypot: hidden from people and assistive tech. */}
            <div
              aria-hidden="true"
              className="absolute -left-[10000px] h-px w-px overflow-hidden"
            >
              <label htmlFor={`${id}-website`}>Website</label>
              <input
                id={`${id}-website`}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </div>

            <p
              role="status"
              aria-live="polite"
              className="text-sm font-medium empty:hidden"
            >
              {formError ?? ""}
            </p>

            <Button
              type="submit"
              variant="solid"
              disabled={status === "loading"}
              className="w-full md:w-auto md:self-end"
            >
              {status === "loading" ? (
                <LoaderCircle
                  aria-hidden
                  size={18}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : null}
              {status === "loading" ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
