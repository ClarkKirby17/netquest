"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ActionState } from "../actions";

const initial: ActionState = {};
const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function ResetForm({
  email,
  devCode,
}: {
  email: string;
  devCode?: string;
}) {
  const [state, action, pending] = useActionState(resetPassword, initial);

  return (
    <>
      <h1 className="font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        If <span className="font-medium text-[var(--color-text)]">{email}</span> has an
        account, a 6-digit code is on its way. It expires in 15 minutes.
      </p>

      {devCode && (
        <div className="mt-5 rounded-[10px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-4 py-3 text-sm">
          <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-warn)]">
            dev mode — email not configured
          </span>
          <div className="mt-1">
            Your code:{" "}
            <span className="font-[family-name:var(--font-mono-src)] text-lg font-bold tracking-[.3em] text-[var(--color-warn)]">
              {devCode}
            </span>
          </div>
        </div>
      )}

      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="email" value={email} />

        <div>
          <label htmlFor="code" className={labelCx}>Reset code</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            required
            className={`${inputCx} text-center font-[family-name:var(--font-mono-src)] text-2xl font-bold tracking-[.4em]`}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelCx}>New password</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputCx}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelCx}>Confirm new password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputCx}
          />
        </div>

        {state.error && (
          <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
          {pending ? "Updating…" : "Set new password"}
        </button>
      </form>

      <p className="mt-7 border-t border-[var(--color-line)] pt-6 text-sm text-[var(--color-muted)]">
        Didn&apos;t get a code?{" "}
        <Link href="/forgot-password" className="font-medium text-[var(--color-signal)] hover:underline">
          Try again
        </Link>
      </p>
    </>
  );
}
