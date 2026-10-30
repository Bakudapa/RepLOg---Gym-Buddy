"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { FeedbackTable } from "./feedback-table";
import { WaitlistTable } from "./waitlist-table";

const tabs = [
  { key: "waitlist", label: "Waitlist" },
  { key: "feedback", label: "Feedback" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

/** WAI-ARIA tabs with automatic activation and arrow-key navigation. */
export function AdminTabs() {
  const id = useId();
  const [active, setActive] = useState<TabKey>("waitlist");
  const refs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    waitlist: null,
    feedback: null,
  });

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((tab) => tab.key === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const key = tabs[next].key;
    setActive(key);
    refs.current[key]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Admin data"
        onKeyDown={onKeyDown}
        className="flex border-b border-line"
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(element) => {
                refs.current[tab.key] = element;
              }}
              id={`${id}-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.key)}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-base font-medium transition-colors duration-200",
                selected
                  ? "border-fg text-fg"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${id}-panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={tab.key !== active}
          tabIndex={0}
          className="pt-6 focus-visible:outline-offset-4"
        >
          {tab.key === active ? (
            tab.key === "waitlist" ? (
              <WaitlistTable />
            ) : (
              <FeedbackTable />
            )
          ) : null}
        </div>
      ))}
    </>
  );
}
