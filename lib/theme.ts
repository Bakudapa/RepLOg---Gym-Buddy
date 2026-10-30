export type ThemePreference = "light" | "dark" | "system";

export const THEME_KEY = "replog:theme";
export const THEME_PREFERENCES: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme (FR12).
 * Kept tiny and dependency-free; it is inlined as a string.
 */
export const themeInitScript = `(function(){var d=document.documentElement;d.classList.add("js");var p="system";try{var s=localStorage.getItem("${THEME_KEY}");if(s==="light"||s==="dark"||s==="system")p=s}catch(e){}var dark=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light"})();`;
