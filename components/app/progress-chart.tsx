"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatLocal } from "@/components/ui/local-time";
import { useIsClient } from "@/components/ui/use-is-client";
import { formatKg } from "@/lib/one-rep-max";
import { layoutChart, type ChartPoint } from "@/lib/workout/chart";

const HEIGHT = 240;

/**
 * FR28: best estimated 1RM per session over time, drawn as an SVG line. The SVG is
 * rendered at the container's real width so axis text stays readable on phones.
 * PR sessions are marked with the accent colour; a data table follows for screen
 * readers and anyone who prefers numbers.
 */
export function ProgressChart({
  points,
  exerciseName,
}: {
  points: ChartPoint[];
  exerciseName: string;
}) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const isClient = useIsClient();
  const tz = isClient ? undefined : "UTC";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = width > 0 ? layoutChart(points, { width, height: HEIGHT }) : null;
  const first = points[0];
  const last = points[points.length - 1];
  const labelIndexes =
    width >= 480 && points.length > 2
      ? [0, Math.floor((points.length - 1) / 2), points.length - 1]
      : [0, points.length - 1];

  return (
    <figure>
      <div ref={containerRef} className="w-full" style={{ height: HEIGHT }}>
        {layout ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-labelledby={`${id}-title ${id}-desc`}
            className="block overflow-visible"
          >
            <title id={`${id}-title`}>{`Estimated 1RM for ${exerciseName}`}</title>
            <desc id={`${id}-desc`}>
              {`${points.length} sessions from ${formatLocal(first.date, "date", tz)} to ${formatLocal(last.date, "date", tz)}. ` +
                `Latest ${formatKg(last.value)} kg, best ${formatKg(Math.max(...points.map((p) => p.value)))} kg.`}
            </desc>
            {layout.yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={layout.plot.left}
                  x2={layout.plot.right}
                  y1={tick.y}
                  y2={tick.y}
                  className="stroke-line"
                  strokeWidth={1}
                />
                <text
                  x={layout.plot.left - 8}
                  y={tick.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="num fill-muted text-xs"
                >
                  {formatKg(tick.value)}
                </text>
              </g>
            ))}
            <path
              d={layout.path}
              fill="none"
              className="stroke-fg"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {layout.points.map((point) =>
              point.isPr ? (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r={5}
                  className="fill-accent stroke-accent"
                />
              ) : (
                <circle
                  key={point.date}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  className="fill-bg stroke-fg"
                  strokeWidth={1.5}
                />
              ),
            )}
            {labelIndexes.map((index, position) => {
              const point = layout.points[index];
              const anchor =
                position === 0
                  ? "start"
                  : position === labelIndexes.length - 1
                    ? "end"
                    : "middle";
              return (
                <text
                  key={`${index}-${position}`}
                  x={
                    anchor === "start"
                      ? layout.plot.left
                      : anchor === "end"
                        ? layout.plot.right
                        : point.x
                  }
                  y={HEIGHT - 8}
                  textAnchor={anchor}
                  className="fill-muted text-xs"
                >
                  {formatLocal(point.date, "short", tz)}
                </text>
              );
            })}
            <text
              x={0}
              y={layout.plot.top - 2}
              className="fill-muted text-xs"
              dominantBaseline="hanging"
            >
              kg
            </text>
          </svg>
        ) : null}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="4" className="fill-accent" />
          </svg>
          New estimated 1RM record
        </span>
        <span>Best estimated 1RM per session (Epley).</span>
      </figcaption>

      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium">
          Show data as a table
        </summary>
        <table className="mt-2 w-full max-w-md border-collapse text-left">
          <caption className="sr-only">{`Best estimated 1RM per session for ${exerciseName}`}</caption>
          <thead>
            <tr className="border-b border-line-strong text-sm text-muted">
              <th scope="col" className="py-2 font-medium">
                Date
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Estimated 1RM
              </th>
              <th scope="col" className="py-2 pl-4 font-medium">
                <span className="sr-only">Record</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date} className="border-b border-line">
                <td className="py-2 text-sm">{formatLocal(point.date, "date", tz)}</td>
                <td className="num py-2 text-right">{formatKg(point.value)} kg</td>
                <td className="py-2 pl-4 text-sm">{point.isPr ? "PR" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
