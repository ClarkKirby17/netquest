import Link from "next/link";
import { Compass, Home } from "lucide-react";

/* Shown for unknown URLs and for notFound() — which the reader and the
   quiz pages call deliberately when a student may not open something. */
export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] border border-[var(--color-line)] text-[var(--color-muted)]">
          <Compass size={24} />
        </span>

        <div className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.2em] text-[var(--color-signal)]">
          404 · no route to host
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display-src)] text-2xl font-bold tracking-tight">
          Nothing here
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          This page doesn&apos;t exist — or it&apos;s part of a module you
          haven&apos;t unlocked yet. Finish what came before it and the route
          opens up.
        </p>

        <div className="mt-7">
          <Link href="/" className="btn btn-primary">
            <Home size={16} /> Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
