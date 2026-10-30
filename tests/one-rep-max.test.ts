import { describe, expect, it } from "vitest";
import {
  estimateOneRepMax,
  formatKg,
  percentageTable,
  roundToHalf,
} from "@/lib/one-rep-max";

describe("estimateOneRepMax", () => {
  it("applies the Epley formula", () => {
    // 100 × (1 + 5/30) = 116.67 → 116.5
    expect(estimateOneRepMax(100, 5)).toBe(116.5);
    // 80 × (1 + 8/30) = 101.33 → 101.5
    expect(estimateOneRepMax(80, 8)).toBe(101.5);
    // 60 × (1 + 10/30) = 80
    expect(estimateOneRepMax(60, 10)).toBe(80);
  });

  it("returns the weight itself for a single rep", () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
    expect(estimateOneRepMax(82.5, 1)).toBe(82.5);
  });

  it("rounds the result to the nearest 0.5 kg", () => {
    // 102.5 × (1 + 3/30) = 112.75 → 113 (round half up)
    expect(estimateOneRepMax(102.5, 3)).toBe(113);
    expect(estimateOneRepMax(57.5, 7) % 0.5).toBe(0);
  });
});

describe("roundToHalf", () => {
  it("rounds to the nearest half", () => {
    expect(roundToHalf(10.24)).toBe(10);
    expect(roundToHalf(10.25)).toBe(10.5);
    expect(roundToHalf(10.74)).toBe(10.5);
    expect(roundToHalf(10.76)).toBe(11);
  });
});

describe("percentageTable", () => {
  it("lists 95% down to 60% in steps of 5, rounded to 0.5 kg", () => {
    const rows = percentageTable(117);
    expect(rows.map((row) => row.percent)).toEqual([95, 90, 85, 80, 75, 70, 65, 60]);
    expect(rows[0]).toEqual({ percent: 95, weight: 111 }); // 111.15
    expect(rows[1]).toEqual({ percent: 90, weight: 105.5 }); // 105.3
    expect(rows[7]).toEqual({ percent: 60, weight: 70 }); // 70.2
    for (const row of rows) expect(row.weight % 0.5).toBe(0);
  });
});

describe("formatKg", () => {
  it("drops trailing zeros", () => {
    expect(formatKg(100)).toBe("100");
    expect(formatKg(82.5)).toBe("82.5");
  });
});
