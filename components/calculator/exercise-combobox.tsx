"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  hasExactMatch,
  searchExercises,
  searchWithRecent,
  type Suggestion,
} from "@/lib/exercise-search";
import { EXERCISES } from "@/lib/exercises";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/field";

type Option =
  | { kind: "exercise"; value: string; suggestion: Suggestion }
  | { kind: "custom"; value: string };

type ExerciseComboboxProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  /** Exercises the user logged before; suggested first (FR24). */
  recent?: string[];
  /** Called when a suggestion is picked (not on every keystroke). */
  onSelect?: (value: string) => void;
  /**
   * "top" opens the list above the field, for forms pinned to the bottom of the
   * screen; "top-mobile" does that on phones only and opens below from tablet up.
   */
  placement?: "top" | "bottom" | "top-mobile";
  disabled?: boolean;
};

function Highlight({ text, start, end }: { text: string; start: number; end: number }) {
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-transparent font-semibold text-accent">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

/**
 * Autocomplete text field following the WAI-ARIA APG combobox pattern (list autocomplete).
 * Focus stays on the input; the active option is exposed through aria-activedescendant.
 */
export function ExerciseCombobox({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  recent,
  onSelect,
  placement = "bottom",
  disabled,
}: ExerciseComboboxProps) {
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const options = useMemo<Option[]>(() => {
    const suggestions = recent ? searchWithRecent(value, recent) : searchExercises(value);
    const list: Option[] = suggestions.map((suggestion) => ({
      kind: "exercise",
      value: suggestion.name,
      suggestion,
    }));
    const typed = value.trim();
    if (typed !== "" && !hasExactMatch(typed, EXERCISES, recent))
      list.push({ kind: "custom", value: typed });
    return list;
  }, [value, recent]);

  const expanded = open && options.length > 0;

  // Close when tapping or clicking anywhere outside the component.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!expanded || activeIndex < 0) return;
    const element = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    element?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded]);

  function openList() {
    setOpen(true);
    setActiveIndex(-1);
  }

  function select(option: Option) {
    onChange(option.value);
    onSelect?.(option.value);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (options.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        if (!expanded) {
          setOpen(true);
          setActiveIndex(step === 1 ? 0 : options.length - 1);
          return;
        }
        setActiveIndex((index) => {
          if (index === -1) return step === 1 ? 0 : options.length - 1;
          return (index + step + options.length) % options.length;
        });
        return;
      }
      case "Enter":
        if (expanded && activeIndex >= 0) {
          event.preventDefault();
          select(options[activeIndex]);
        }
        return;
      case "Escape":
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  }

  function onFocus() {
    openList();
    // On touch devices, bring the field near the top so the virtual keyboard
    // does not cover the suggestions that open below it.
    if (placement === "bottom" && window.matchMedia("(pointer: coarse)").matches) {
      window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "start" }), 300);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="next"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={value}
        disabled={disabled}
        placeholder="e.g. Bench Press"
        className={cn(inputClass(invalid), "scroll-mt-24")}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={onFocus}
        onClick={() => !open && openList()}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={value.trim() === "" ? "Popular exercises" : "Suggested exercises"}
        hidden={!expanded}
        className={cn(
          "absolute inset-x-0 z-20 max-h-[min(20rem,45dvh)] overflow-y-auto overscroll-contain rounded-md border border-line-strong bg-surface py-1",
          placement === "top" && "bottom-full mb-1",
          placement === "bottom" && "top-full mt-1",
          placement === "top-mobile" &&
            "bottom-full mb-1 md:top-full md:bottom-auto md:mt-1 md:mb-0",
        )}
      >
        {value.trim() === "" ? (
          <li
            role="presentation"
            className="px-3 pt-1 pb-2 text-xs font-medium text-muted"
          >
            {recent?.length ? "Recent and popular" : "Popular"}
          </li>
        ) : null}
        {options.map((option, index) => (
          <li
            key={`${option.kind}-${option.value}`}
            id={optionId(index)}
            data-index={index}
            role="option"
            aria-selected={index === activeIndex}
            aria-label={
              option.kind === "custom"
                ? `Use "${option.value}"`
                : option.suggestion.alias
                  ? `${option.value} (${option.suggestion.alias.text})`
                  : undefined
            }
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-base",
              index === activeIndex &&
                "bg-bg outline outline-1 -outline-offset-1 outline-fg",
              option.kind === "custom" && "border-t border-line",
            )}
            // Keep focus on the input while picking with a mouse or finger.
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => select(option)}
            onPointerMove={() => index !== activeIndex && setActiveIndex(index)}
          >
            {option.kind === "custom" ? (
              <span>
                Use &ldquo;<span className="font-medium">{option.value}</span>&rdquo;
              </span>
            ) : (
              <>
                <span>
                  {option.suggestion.match ? (
                    <Highlight text={option.value} {...option.suggestion.match} />
                  ) : (
                    option.value
                  )}
                </span>
                {option.suggestion.recent ? (
                  <span className="text-xs text-muted">Recent</span>
                ) : null}
                {option.suggestion.alias ? (
                  <span className="text-sm text-muted">
                    <Highlight
                      text={option.suggestion.alias.text}
                      start={option.suggestion.alias.start}
                      end={option.suggestion.alias.end}
                    />
                  </span>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
