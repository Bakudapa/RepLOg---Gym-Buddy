"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WaitlistCount = { count: number | null; increment: () => void };

const WaitlistCountContext = createContext<WaitlistCount | null>(null);

/** Shares the counter between the Hero and the form, for the optimistic +1 (FR11). */
export function WaitlistCountProvider({
  initialCount,
  children,
}: {
  initialCount: number | null;
  children: ReactNode;
}) {
  const [count, setCount] = useState(initialCount);
  const increment = useCallback(
    () => setCount((value) => (value === null ? null : value + 1)),
    [],
  );
  const value = useMemo(() => ({ count, increment }), [count, increment]);
  return <WaitlistCountContext value={value}>{children}</WaitlistCountContext>;
}

export function useWaitlistCount(): WaitlistCount {
  const context = use(WaitlistCountContext);
  if (!context)
    throw new Error("useWaitlistCount must be used inside WaitlistCountProvider");
  return context;
}
