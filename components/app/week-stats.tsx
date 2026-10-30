"use client";

import { useIsClient } from "@/components/ui/use-is-client";
import { formatKg } from "@/lib/one-rep-max";
import { startOfWeek, weekStats, type WeekSession } from "@/lib/workout/week";
import { StatCard } from "./stat-card";

/** FR22: this week's totals; the week starts on Monday in the device's time zone. */
export function WeekStats({ sessions }: { sessions: WeekSession[] }) {
  const isClient = useIsClient();
  // The server has no device time zone, so it renders placeholders first.
  const stats = isClient ? weekStats(sessions, startOfWeek(new Date())) : null;
  return (
    <section aria-labelledby="week-title">
      <h2 id="week-title" className="text-lg font-semibold">
        This week
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-x-4">
        <StatCard label="Workouts" value={stats ? stats.sessions : "–"} />
        <StatCard label="Sets" value={stats ? stats.sets : "–"} />
        <StatCard
          label="Volume"
          value={stats ? formatKg(stats.volumeKg) : "–"}
          unit="kg"
        />
      </dl>
    </section>
  );
}
