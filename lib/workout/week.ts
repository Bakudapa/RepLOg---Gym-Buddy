/**
 * Monday 00:00 of the week containing `date`, in the runtime's local time zone.
 * Called in the browser, so "local" is the device's zone (FR22).
 */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export type WeekSession = { startedAt: string; setCount: number; volumeKg: number };

export type WeekStats = { sessions: number; sets: number; volumeKg: number };

/** Totals for sessions that started on or after `weekStart`. */
export function weekStats(sessions: WeekSession[], weekStart: Date): WeekStats {
  const from = weekStart.getTime();
  const inWeek = sessions.filter(
    (session) => new Date(session.startedAt).getTime() >= from,
  );
  return {
    sessions: inWeek.length,
    sets: inWeek.reduce((total, session) => total + session.setCount, 0),
    volumeKg:
      Math.round(inWeek.reduce((total, session) => total + session.volumeKg, 0) * 10) /
      10,
  };
}
