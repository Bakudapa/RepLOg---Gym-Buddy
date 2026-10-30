"use client";

import { Minus, Plus, Square } from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { cn } from "@/lib/cn";

export const REST_DURATIONS = [60, 90, 120, 180] as const;
const STORAGE_KEY = "replog:rest-seconds";
const DEFAULT_SECONDS = 90;

export type RestTimerHandle = { start: () => void };

// Duration preference in localStorage (wrapped in try/catch: storage can be blocked).
const listeners = new Set<() => void>();
function readDuration(): number {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return (REST_DURATIONS as readonly number[]).includes(value)
      ? value
      : DEFAULT_SECONDS;
  } catch {
    return DEFAULT_SECONDS;
  }
}
function writeDuration(seconds: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(seconds));
  } catch {
    // Keep working without persistence.
  }
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** mm:ss */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Short beep with the Web Audio API; silently skipped when unsupported. */
function beep(context: AudioContext | null) {
  if (!context) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.32);
  } catch {
    // Audio is a nice-to-have.
  }
}

/**
 * Rest timer (FR24). Starts when a set is added (via the `start` handle), ±15 s,
 * stop, and a remembered duration. Vibrates and beeps at zero where supported.
 */
export function RestTimer({
  ref,
  disabled,
}: {
  ref?: Ref<RestTimerHandle>;
  disabled?: boolean;
}) {
  const duration = useSyncExternalStore(subscribe, readDuration, () => DEFAULT_SECONDS);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const audioRef = useRef<AudioContext | null>(null);

  const start = useCallback(() => {
    // Created inside the click that added the set, so browsers allow sound later.
    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!audioRef.current && AudioCtor) audioRef.current = new AudioCtor();
      void audioRef.current?.resume();
    } catch {
      audioRef.current = null;
    }
    const current = Date.now();
    setNow(current);
    setEndAt(current + readDuration() * 1000);
    setAnnouncement("");
  }, []);

  useImperativeHandle(ref, () => ({ start }), [start]);

  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endAt) {
        window.clearInterval(id);
        setEndAt(null);
        setAnnouncement("Rest is over.");
        navigator.vibrate?.([200, 100, 200]);
        beep(audioRef.current);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  const running = endAt !== null;
  const remaining = running ? (endAt - now) / 1000 : duration;
  const adjust = (seconds: number) =>
    setEndAt((value) =>
      value === null ? value : Math.max(Date.now() + 1000, value + seconds * 1000),
    );

  const iconButton =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line-strong text-fg transition-colors duration-200 hover:bg-surface disabled:opacity-60";

  return (
    <section
      aria-label="Rest timer"
      className="flex min-h-11 items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-sm text-muted">Rest</span>
        <span
          role="timer"
          aria-live="off"
          className={cn("num font-medium", running ? "text-xl" : "text-lg")}
        >
          {formatClock(remaining)}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {running ? (
        <div className="flex gap-2">
          <button
            type="button"
            className={iconButton}
            onClick={() => adjust(-15)}
            aria-label="15 seconds less"
          >
            <Minus aria-hidden size={18} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => adjust(15)}
            aria-label="15 seconds more"
          >
            <Plus aria-hidden size={18} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => setEndAt(null)}
            aria-label="Stop rest timer"
          >
            <Square aria-hidden size={16} />
          </button>
        </div>
      ) : (
        <div role="group" aria-label="Rest duration" className="flex gap-1">
          {REST_DURATIONS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              aria-pressed={seconds === duration}
              disabled={disabled}
              onClick={() => writeDuration(seconds)}
              className={cn(
                "num inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 text-sm transition-colors duration-200",
                seconds === duration ? "bg-fg text-bg" : "text-fg hover:bg-surface",
              )}
            >
              {seconds}s
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
