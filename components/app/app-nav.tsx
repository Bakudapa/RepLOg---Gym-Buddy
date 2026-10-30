"use client";

import { Calculator, Dumbbell, History, House, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app", label: "Dashboard", Icon: House },
  { href: "/app/history", label: "History", Icon: History },
  { href: "/app/exercises", label: "Exercises", Icon: Dumbbell },
  { href: "/app/settings", label: "Settings", Icon: Settings },
  // The 1RM calculator lives on the public landing page.
  { href: "/#calculator", label: "1RM", Icon: Calculator },
];

function isActive(pathname: string, href: string) {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * App navigation (PRD-app section 12): a top bar from the tablet breakpoint (links
 * hidden on phones), and AppTabBar at the bottom on phones.
 */
export function AppHeader({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <div className="container-page flex h-14 items-center justify-between gap-4 md:h-16">
        <Link
          href="/app"
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-lg font-semibold tracking-tight"
        >
          RepLog
        </Link>
        <nav aria-label="App" className="hidden items-center gap-1 md:flex">
          {items.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-200",
                isActive(pathname, href)
                  ? "text-fg underline decoration-2 underline-offset-8"
                  : "text-muted hover:text-fg",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <span className="hidden max-w-40 truncate text-sm text-muted lg:inline">
            {displayName}
          </span>
          <ThemeToggle />
          <form action={logOut} className="hidden md:block">
            <button
              type="submit"
              className="inline-flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-200 hover:bg-surface"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut aria-hidden size={18} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom tab bar on phones. The active workout screen hides it so the add-set form
 * can sit at the bottom of the screen. Render it after the page content.
 */
export function AppTabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/app/workout/")) return null;

  return (
    <>
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-200",
                    active ? "text-fg" : "text-muted",
                  )}
                >
                  <Icon aria-hidden size={20} strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Keeps the last content clear of the fixed tab bar on phones. */}
      <div
        aria-hidden="true"
        className="h-[calc(3.5rem+env(safe-area-inset-bottom))] md:hidden"
      />
    </>
  );
}
