import Link from "next/link";
import { Led } from "@/components/ui";

export default function PendingPage() {
  return (
    <>
      <span className="nq-eyebrow">
        <Led state="live" />
        email verified
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        You&apos;re in the queue
      </h1>
      <p className="mt-3 leading-relaxed text-[var(--color-muted)]">
        Your email is confirmed. Your account now waits for approval — students
        are approved by their instructor, instructors by an admin. You&apos;ll be
        able to sign in as soon as that happens.
      </p>

      <div className="nq-term mt-7">
        <div className="dim">$ nq account --status</div>
        <div className="out mt-1">
          <span className="text-[var(--color-muted)]">email     </span>
          <span className="text-[var(--color-signal)]">verified ✓</span>
        </div>
        <div className="out">
          <span className="text-[var(--color-muted)]">approval  </span>
          <span className="text-[var(--color-warn)]">pending…</span>
        </div>
      </div>

      <Link href="/login" className="btn btn-ghost mt-7">
        Back to sign in
      </Link>
    </>
  );
}
