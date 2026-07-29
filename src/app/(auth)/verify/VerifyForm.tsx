"use client";

import { useActionState } from "react";
import { verifyAction, resendCodeAction, type ActionState } from "../actions";

const initial: ActionState = {};

export default function VerifyForm({
  email,
  devCode,
}: {
  email: string;
  devCode?: string;
}) {
  const [state, action, pending] = useActionState(verifyAction, initial);
  const [resendState, resendAction, resending] = useActionState(resendCodeAction, initial);
  const shownDevCode = resendState.devCode ?? devCode;

  return (
    <>
      <h1 className="font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
        Check your email
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-[var(--color-text)]">{email}</span>.
        It expires in 15 minutes.
      </p>

      {shownDevCode && (
        <div className="mt-5 rounded-[10px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-4 py-3 text-sm">
          <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-warn)]">
            dev mode — email not configured
          </span>
          <div className="mt-1">
            Your code:{" "}
            <span className="font-[family-name:var(--font-mono-src)] text-lg font-bold tracking-[.3em] text-[var(--color-warn)]">
              {shownDevCode}
            </span>
          </div>
        </div>
      )}

      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="email" value={email} />
        <div>
          <label
            htmlFor="code"
            className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]"
          >
            Verification code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            required
            className="w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-3 text-center font-[family-name:var(--font-mono-src)] text-2xl font-bold tracking-[.4em] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]"
          />
        </div>

        {state.error && (
          <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
          {pending ? "Checking…" : "Verify email"}
        </button>
      </form>

      <form action={resendAction} className="mt-5 text-center">
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={resending}
          className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)] disabled:opacity-60"
        >
          {resending ? "Sending…" : "Didn't get it? Send a new code"}
        </button>
        {resendState.error && (
          <p className="mt-2 text-xs text-[var(--color-muted)]">{resendState.error}</p>
        )}
      </form>
    </>
  );
}
