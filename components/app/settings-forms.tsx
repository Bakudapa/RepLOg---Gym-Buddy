"use client";

import { LogOut } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { logOut } from "@/app/(auth)/actions";
import { deleteAccount, updateDisplayName } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { displayNameSchema, fieldErrors } from "@/lib/validation/schemas";

export function DisplayNameForm({
  initial,
  readOnly,
}: {
  initial: string;
  readOnly: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = displayNameSchema.safeParse({ displayName: value });
    if (!parsed.success) {
      setError(fieldErrors<"displayName">(parsed.error).displayName);
      return;
    }
    setError(undefined);
    setStatus("saving");
    const result = await updateDisplayName(value);
    if (result.ok) setStatus("saved");
    else {
      setStatus("idle");
      setError(result.fields?.displayName ?? result.error);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-3 md:flex-row md:items-start"
    >
      <div className="md:flex-1">
        <label htmlFor={`${id}-name`} className="block text-sm font-medium">
          Display name
        </label>
        <input
          id={`${id}-name`}
          value={value}
          maxLength={40}
          autoComplete="nickname"
          disabled={readOnly}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus("idle");
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(`${id}-name`, error)}
          className={cn(inputClass(Boolean(error)), "mt-2")}
        />
        <FieldError id={`${id}-name-error`} message={error} />
      </div>
      <Button
        type="submit"
        variant="solid"
        disabled={readOnly || status === "saving"}
        className="md:mt-7"
      >
        Save
      </Button>
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-muted md:basis-full empty:hidden"
      >
        {status === "saved" ? "Saved." : ""}
      </p>
    </form>
  );
}

export function LogoutButton() {
  return (
    <form action={logOut}>
      <Button type="submit" variant="secondary">
        <LogOut aria-hidden size={18} />
        Log out
      </Button>
    </form>
  );
}

/** FR29: deleting needs the password, typed inside a confirmation dialog. */
export function DeleteAccount({ readOnly }: { readOnly: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setPending(true);
    const result = await deleteAccount(password);
    // Success signs out and redirects to the landing page.
    setPending(false);
    if (result && !result.ok) setError(result.fields?.password ?? result.error);
  }

  return (
    <>
      <Button
        variant="secondary"
        className="border-fg font-semibold"
        disabled={readOnly}
        onClick={() => {
          setPassword("");
          setError(undefined);
          setOpen(true);
        }}
      >
        Delete account
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete your account?"
        description="This permanently deletes your account and every workout and set you logged. It can't be undone."
        confirmLabel="Delete account"
        destructive
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <div className="mt-5">
          <label htmlFor={`${id}-password`} className="block text-sm font-medium">
            Your password
          </label>
          <input
            id={`${id}-password`}
            type="password"
            autoComplete="current-password"
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirm();
              }
            }}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(`${id}-password`, error)}
            className={cn(inputClass(Boolean(error)), "mt-2")}
          />
          <FieldError id={`${id}-password-error`} message={error} />
        </div>
      </ConfirmDialog>
    </>
  );
}
