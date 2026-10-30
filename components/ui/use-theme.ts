"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { isThemePreference, THEME_KEY, type ThemePreference } from "@/lib/theme";

const listeners = new Set<() => void>();
// Fallback when localStorage is unavailable: the choice lasts for this page view.
let memoryPreference: ThemePreference = "system";

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return memoryPreference;
  }
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && prefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => "system" as const,
  );

  // Keep the page in sync with the preference, and follow OS changes while on "system".
  useEffect(() => {
    apply(preference);
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: keep the in-memory choice.
    }
    apply(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { preference, setPreference };
}
