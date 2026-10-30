"use client";

import { Check } from "lucide-react";
import { useSearchParams } from "next/navigation";

/** Confirmation after FR29 account deletion (/?account=deleted). */
export function AccountDeletedNotice() {
  const params = useSearchParams();
  if (params.get("account") !== "deleted") return null;
  return (
    <div role="status" className="border-b border-line bg-surface">
      <p className="container-page flex items-center gap-2 py-3 text-sm">
        <Check aria-hidden size={16} />
        Your account and all its data have been deleted.
      </p>
    </div>
  );
}
