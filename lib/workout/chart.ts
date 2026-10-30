import type { ProgressRange } from "@/lib/validation/schemas";

/** Start of the selected range (FR28), or null for "all". */
export function rangeStart(range: ProgressRange, now: Date): Date | null {
  if (range === "all") return null;
  const weeks = range === "4w" ? 4 : 12;
  return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
}

/** Round step sizes (1, 2, 2.5, 5 × 10^n) for axis ticks. */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const pad = Math.max(2.5, Math.abs(min) * 0.05);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 1000; value += step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

export type ChartPoint = { date: string; value: number; isPr: boolean };

export type PlottedPoint = ChartPoint & { x: number; y: number };

export type ChartLayout = {
  points: PlottedPoint[];
  yTicks: Array<{ value: number; y: number }>;
  path: string;
  plot: { left: number; right: number; top: number; bottom: number };
};

/**
 * Maps points to SVG coordinates. X is proportional to time, so gaps between
 * sessions show as gaps; Y uses nice ticks that include every value.
 */
export function layoutChart(
  points: ChartPoint[],
  size: { width: number; height: number },
  margin = { top: 12, right: 12, bottom: 28, left: 48 },
): ChartLayout {
  const plot = {
    left: margin.left,
    right: size.width - margin.right,
    top: margin.top,
    bottom: size.height - margin.bottom,
  };
  if (points.length === 0) return { points: [], yTicks: [], path: "", plot };

  const values = points.map((point) => point.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const times = points.map((point) => new Date(point.date).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);

  const x = (time: number) =>
    tMax === tMin
      ? (plot.left + plot.right) / 2
      : plot.left + ((time - tMin) / (tMax - tMin)) * (plot.right - plot.left);
  const y = (value: number) =>
    plot.bottom - ((value - yMin) / (yMax - yMin)) * (plot.bottom - plot.top);

  const plotted = points.map((point, index) => ({
    ...point,
    x: x(times[index]),
    y: y(point.value),
  }));
  return {
    points: plotted,
    yTicks: ticks.map((value) => ({ value, y: y(value) })),
    path: plotted
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
      )
      .join(" "),
    plot,
  };
}
