"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_PREFERENCES, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { useTheme } from "./use-theme";

const meta: Record<ThemePreference, { label: string; Icon: typeof Sun }> = {
  system: { label: "System", Icon: Monitor },
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
};

/** Single button that cycles System → Light → Dark. Used in the desktop navbar. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const next = THEME_PREFERENCES[(THEME_PREFERENCES.indexOf(preference) + 1) % 3];
  const { Icon, label } = meta[preference];

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${label}. Switch to ${meta[next].label.toLowerCase()}`}
      title={`Theme: ${label}`}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-200 hover:bg-surface",
        className,
      )}
    >
      <Icon aria-hidden size={18} />
    </button>
  );
}

/** Three explicit options. Used in the mobile menu, where there is room for labels. */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  return (
    <fieldset>
      <legend className="text-sm font-medium text-muted">Theme</legend>
      <div className="mt-2 grid grid-cols-3 rounded-md border border-line-strong p-1">
        {THEME_PREFERENCES.map((option) => {
          const { Icon, label } = meta[option];
          const active = option === preference;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => setPreference(option)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors duration-200",
                active ? "bg-fg text-bg" : "text-fg hover:bg-surface",
              )}
            >
              <Icon aria-hidden size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
