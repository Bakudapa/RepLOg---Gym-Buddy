"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";

const links = [
  { href: "#features", label: "Features" },
  { href: "#calculator", label: "Calculator" },
  { href: "#faq", label: "FAQ" },
];

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-3 font-medium text-fg transition-colors duration-200 hover:bg-surface";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

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
              <a href="#feedback" className={`${linkClass} text-sm`}>
                Feedback
              </a>
            </li>
          </ul>
          <a href="#waitlist" className={buttonClass("primary", "ml-2 text-sm")}>
            Join the waitlist
          </a>
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
            <a
              href="#feedback"
              className={`${linkClass} w-full text-base`}
              onClick={() => close(false)}
            >
              Feedback
            </a>
          </li>
        </ul>
        <div className="container-page flex flex-col gap-3 border-t border-line py-4">
          <a
            href="#waitlist"
            className={buttonClass("primary", "w-full")}
            onClick={() => close(false)}
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
