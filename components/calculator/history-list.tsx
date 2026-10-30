"use client";

import { Trash2 } from "lucide-react";
import { formatKg } from "@/lib/one-rep-max";
import type { HistoryEntry } from "@/lib/history";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

type HistoryListProps = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (exercise: string) => void;
  onClear: () => void;
};

export function HistoryList({ entries, onSelect, onRemove, onClear }: HistoryListProps) {
  return (
    <section aria-labelledby="history-title">
      <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line-strong">
        <h3 id="history-title" className="text-base font-semibold">
          History
        </h3>
        {entries.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="-mr-3 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted transition-colors duration-200 hover:text-fg"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="py-4 text-sm text-muted">
          Calculations are saved on this device. Nothing here yet.
        </p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li
              key={entry.exercise.toLowerCase()}
              className="flex items-center border-b border-line"
            >
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-4 py-2 pr-2 text-left transition-colors duration-200 hover:bg-surface"
                aria-label={`Load ${entry.exercise}: ${formatKg(entry.weight)} kg for ${entry.reps} reps, estimated 1RM ${formatKg(entry.oneRepMax)} kg`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium">
                    {entry.exercise}
                  </span>
                  <span className="num block text-sm text-muted">
                    {formatKg(entry.weight)} × {entry.reps} ·{" "}
                    {dateFormat.format(entry.createdAt)}
                  </span>
                </span>
                <span className="num shrink-0 text-base">
                  {formatKg(entry.oneRepMax)} kg
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.exercise)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-200 hover:text-fg"
                aria-label={`Remove ${entry.exercise} from history`}
              >
                <Trash2 aria-hidden size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
