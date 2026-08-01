"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/* Catches anything a page throws. Without this Next shows its own
   error screen, which leaks a stack trace in development and looks
   like a crash in production. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)]">
          <AlertTriangle size={24} />
        </span>

        <h1 className="font-[family-name:var(--font-display-src)] text-2xl font-bold tracking-tight">
          Something broke
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          That page hit an error we didn&apos;t plan for. Trying again often
          works — if it doesn&apos;t, head back and take another route.
        </p>

        {error.digest && (
          <p className="mt-4 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
            reference {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            <Home size={16} /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
