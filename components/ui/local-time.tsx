"use client";

import { useIsClient } from "./use-is-client";

const formats = {
  date: { day: "numeric", month: "short", year: "numeric" },
  short: { day: "numeric", month: "short" },
  weekday: { weekday: "short", day: "numeric", month: "short" },
  datetime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  time: { hour: "2-digit", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type LocalTimeFormat = keyof typeof formats;

/** Formats a timestamp in the device's time zone (PRD-app section 12). */
export function formatLocal(
  iso: string,
  format: LocalTimeFormat,
  timeZone?: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { ...formats[format], timeZone }).format(date);
}

/**
 * <time> in the device's time zone. The server does not know it, so the first
 * render uses UTC and the client switches right after hydration.
 */
export function LocalTime({
  iso,
  format = "date",
  className,
}: {
  iso: string;
  format?: LocalTimeFormat;
  className?: string;
}) {
  const isClient = useIsClient();
  return (
    <time dateTime={iso} className={className}>
      {formatLocal(iso, format, isClient ? undefined : "UTC")}
    </time>
  );
}
