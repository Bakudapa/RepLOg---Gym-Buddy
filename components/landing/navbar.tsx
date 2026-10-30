"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { useFeedback } from "@/components/feedback/feedback-context";
import { ThemeSwitcher, ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "#features", label: "Features" },
  { href: "#calculator", label: "Calculator" },
  { href: "#faq", label: "FAQ" },
];

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-2 font-medium text-fg transition-colors duration-200 hover:bg-surface lg:px-3";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { openFeedback } = useFeedback();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    // The panel only exists below the tablet breakpoint.
    const media = window.matchMedia("(min-width: 48rem)");
    const onChange = () => media.matches && close(false);
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onChange);
    };
  }, [open, close]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <nav
        aria-label="Main"
        className="container-page flex h-16 items-center justify-between gap-4"
      >
        <a
          href="#top"
          className="-ml-1 inline-flex min-h-11 items-center px-1 text-lg font-semibold tracking-tight"
        >
          RepLog
        </a>

        <div className="hidden items-center gap-1 md:flex">
          <ul className="flex items-center">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={`${linkClass} text-sm`}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`${linkClass} text-sm`}
                onClick={(event) => openFeedback(event.currentTarget)}
              >
                Feedback
              </button>
            </li>
          </ul>
          <ThemeToggle />
          <Link href="/login" className={`${linkClass} text-sm`}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClass("primary", "ml-1 text-sm")}>
            Get started
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-fg transition-colors duration-200 hover:bg-surface md:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden size={20} /> : <Menu aria-hidden size={20} />}
        </button>
      </nav>

      <div
        id={panelId}
        hidden={!open}
        className="max-h-[calc(100dvh-4rem-env(safe-area-inset-top))] overflow-y-auto border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="container-page flex flex-col py-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`${linkClass} w-full text-base`}
                onClick={() => close(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              className={`${linkClass} w-full text-base`}
              onClick={() => {
                close(false);
                // The menu item disappears with the panel, so focus returns to the menu button.
                openFeedback(toggleRef.current);
              }}
            >
              Feedback
            </button>
          </li>
        </ul>
        <div className="container-page flex flex-col gap-4 border-t border-line py-4">
          <ThemeSwitcher />
          <Link href="/signup" className={buttonClass("primary", "w-full")}>
            Get started
          </Link>
          <Link href="/login" className={buttonClass("secondary", "w-full")}>
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
