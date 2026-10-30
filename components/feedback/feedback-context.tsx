"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FeedbackModal } from "./feedback-modal";

type FeedbackContextValue = {
  /** Opens the modal. Focus returns to `returnFocusTo` (or the active element) on close. */
  openFeedback: (returnFocusTo?: HTMLElement | null) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openFeedback = useCallback((returnFocusTo?: HTMLElement | null) => {
    returnFocusRef.current =
      returnFocusTo ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
    const target = returnFocusRef.current;
    // Wait a frame so the dialog is gone before moving focus.
    requestAnimationFrame(() => target?.focus());
  }, []);

  const value = useMemo(() => ({ openFeedback }), [openFeedback]);

  return (
    <FeedbackContext value={value}>
      {children}
      <FeedbackModal open={open} onClose={onClose} />
    </FeedbackContext>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = use(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider");
  return context;
}
