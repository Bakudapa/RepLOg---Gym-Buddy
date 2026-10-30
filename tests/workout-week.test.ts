import { describe, expect, it } from "vitest";
import { startOfWeek, weekStats } from "@/lib/workout/week";

describe("startOfWeek", () => {
  it("returns Monday 00:00 local time", () => {
    // Thursday 30 Oct 2026, 21:15 local
    const monday = startOfWeek(new Date(2026, 9, 30, 21, 15));
    expect([
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate(),
      monday.getHours(),
    ]).toEqual([2026, 9, 26, 0]);
    expect(monday.getDay()).toBe(1);
  });

  it("treats Sunday as the last day of the week", () => {
    const monday = startOfWeek(new Date(2026, 10, 1, 9, 0));
    expect(monday.getDate()).toBe(26);
  });

  it("keeps Monday itself", () => {
    expect(startOfWeek(new Date(2026, 9, 26, 0, 1)).getDate()).toBe(26);
  });
});

describe("weekStats", () => {
  const weekStart = new Date(2026, 9, 26);
  it("counts only sessions from this week", () => {
    const stats = weekStats(
      [
        {
          startedAt: new Date(2026, 9, 25, 18).toISOString(),
          setCount: 20,
          volumeKg: 5000,
        },
        {
          startedAt: new Date(2026, 9, 26, 7).toISOString(),
          setCount: 18,
          volumeKg: 4200.5,
        },
        {
          startedAt: new Date(2026, 9, 29, 19).toISOString(),
          setCount: 15,
          volumeKg: 3100,
        },
      ],
      weekStart,
    );
    expect(stats).toEqual({ sessions: 2, sets: 33, volumeKg: 7300.5 });
  });

  it("is zero for an empty week", () => {
    expect(weekStats([], weekStart)).toEqual({ sessions: 0, sets: 0, volumeKg: 0 });
  });
});
