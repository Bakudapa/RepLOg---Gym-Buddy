"use client";

import { useEffect, useState } from "react";
import { durationMinutes, formatDuration } from "@/lib/workout/sets";
import { useIsClient } from "@/components/ui/use-is-client";

/** Minutes since the workout started, updated every 30 seconds. */
export function ElapsedTime({ startedAt }: { startedAt: string }) {
  const isClient = useIsClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!isClient) return <span className="num">–</span>;
  return (
    <span className="num">
      {formatDuration(durationMinutes(startedAt, new Date().toISOString()))}
    </span>
  );
}
