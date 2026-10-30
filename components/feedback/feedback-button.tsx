"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedback } from "./feedback-context";

/** The Feedback CTA section button. */
export function FeedbackButton() {
  const { openFeedback } = useFeedback();
  return (
    <Button
      variant="secondary"
      onClick={(event) => openFeedback(event.currentTarget)}
      className="w-full md:w-auto"
    >
      <MessageSquare aria-hidden size={18} />
      Send feedback
    </Button>
  );
}
