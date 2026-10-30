"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** Destructive actions get a bordered button instead of the solid one. */
  destructive?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

/**
 * Native <dialog> for confirmations (delete set, delete workout, finish, delete
 * account). Focus starts on Cancel, Esc and the backdrop cancel. Bottom sheet on
 * phones, centered from the tablet breakpoint (NFR2).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  pending,
  error,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
      // Stop the page behind the dialog from scrolling.
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    return () => {
      if (open) document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      className="modal fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-lg border border-b-0 border-line-strong bg-bg p-0 text-fg backdrop:bg-overlay md:inset-0 md:m-auto md:w-[min(28rem,calc(100%-4rem))] md:rounded-lg md:border-b"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-6 md:pt-6 md:pb-6">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <div id={`${id}-description`} className="mt-2 text-base text-muted">
            {description}
          </div>
        ) : null}
        {children}
        {error ? (
          <p role="alert" className="mt-4 text-sm font-medium">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "secondary" : "solid"}
            onClick={onConfirm}
            disabled={pending}
            className={destructive ? "border-fg font-semibold" : undefined}
          >
            {pending ? (
              <LoaderCircle
                aria-hidden
                size={18}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
