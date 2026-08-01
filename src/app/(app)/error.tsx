"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal error:", error);
  }, [error]);

  return (
    <Card className="p-8 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[12px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)]">
        <AlertTriangle size={20} />
      </span>
      <h2 className="font-[family-name:var(--font-display-src)] text-xl font-bold">
        This page didn&apos;t load
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
        Something went wrong fetching it. Your work is safe — try again, or pick
        another page from the sidebar.
      </p>
      {error.digest && (
        <p className="mt-3 font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
          reference {error.digest}
        </p>
      )}
      <button onClick={reset} className="btn btn-primary mt-6">
        <RotateCcw size={16} /> Try again
      </button>
    </Card>
  );
}
