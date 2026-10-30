import { describe, expect, it } from "vitest";
import { layoutChart, niceTicks, rangeStart } from "@/lib/workout/chart";

describe("rangeStart", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  it("goes back 4 or 12 weeks, or nowhere for all", () => {
    expect(rangeStart("4w", now)?.toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(rangeStart("12w", now)?.toISOString()).toBe("2026-08-07T12:00:00.000Z");
    expect(rangeStart("all", now)).toBeNull();
  });
});

describe("niceTicks", () => {
  it("covers the range with round steps", () => {
    const ticks = niceTicks(97.5, 121);
    expect(ticks[0]).toBeLessThanOrEqual(97.5);
    expect(ticks.at(-1)).toBeGreaterThanOrEqual(121);
    const steps = new Set(ticks.slice(1).map((value, index) => value - ticks[index]));
    expect(steps.size).toBe(1);
    expect([1, 2, 2.5, 5, 10]).toContain([...steps][0]);
  });

  it("pads a flat series so it is not drawn on the edge", () => {
    const ticks = niceTicks(100, 100);
    expect(ticks[0]).toBeLessThan(100);
    expect(ticks.at(-1)).toBeGreaterThan(100);
  });
});

describe("layoutChart", () => {
  const points = [
    { date: "2026-10-01T10:00:00Z", value: 100, isPr: false },
    { date: "2026-10-08T10:00:00Z", value: 105, isPr: true },
    { date: "2026-10-22T10:00:00Z", value: 110, isPr: true },
  ];
  const layout = layoutChart(points, { width: 400, height: 200 });

  it("spaces points by time inside the plot area", () => {
    const xs = layout.points.map((point) => point.x);
    expect(xs[0]).toBe(layout.plot.left);
    expect(xs[2]).toBe(layout.plot.right);
    // One week then two weeks: the second gap is twice the first.
    expect((xs[2] - xs[1]) / (xs[1] - xs[0])).toBeCloseTo(2);
  });

  it("puts higher values higher on screen and builds a path", () => {
    const ys = layout.points.map((point) => point.y);
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(ys[1]).toBeGreaterThan(ys[2]);
    expect(layout.path.startsWith("M")).toBe(true);
    expect(layout.path.split("L")).toHaveLength(3);
  });

  it("handles a single point and no points", () => {
    expect(layoutChart([points[0]], { width: 400, height: 200 }).points[0].x).toBe(
      (48 + 388) / 2,
    );
    expect(layoutChart([], { width: 400, height: 200 }).path).toBe("");
  });
});
