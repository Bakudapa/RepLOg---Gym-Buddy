export const PERCENTAGES = [95, 90, 85, 80, 75, 70, 65, 60] as const;

/** Rounds to the nearest 0.5 kg (half-plates are the smallest common increment). */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Estimated one-rep max using the Epley formula: weight × (1 + reps / 30).
 * A single rep is already a max, so it is returned as-is.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return roundToHalf(weight);
  return roundToHalf(weight * (1 + reps / 30));
}

export type PercentageRow = { percent: number; weight: number };

export function percentageTable(oneRepMax: number): PercentageRow[] {
  return PERCENTAGES.map((percent) => ({
    percent,
    weight: roundToHalf((oneRepMax * percent) / 100),
  }));
}

/** Formats kilograms without trailing zeros: 100 → "100", 82.5 → "82.5". */
export function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
