"use client";

import { useActionState, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { requestPasswordCode, confirmPasswordChange, type AccountState } from "./actions";

const initial: AccountState = { stage: "idle" };
const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function PasswordForm() {
  const [reqState, requestAction, requesting] = useActionState(requestPasswordCode, initial);
  const [confState, confirmAction, confirming] = useActionState(confirmPasswordChange, initial);
  const [restart, setRestart] = useState(false);

  /* Step 2 shows once a code is out and hasn't been reset. */
  const codeSent =
    !restart && (confState.stage === "code-sent" || reqState.stage === "code-sent");
  const devCode = confState.devCode ?? reqState.devCode;
  const done = confState.ok && confState.stage === "idle";

  if (done) {
    return (
      <div className="space-y-4">
        <p className="rounded-[10px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-4 py-3 text-sm text-[var(--color-signal)]">
          {confState.ok}
        </p>
        <button onClick={() => setRestart(true)} className="btn btn-ghost">
          Change it again
        </button>
      </div>
    );
  }

  if (!codeSent) {
    return (
      <form action={requestAction} className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
          <Mail size={15} className="mt-0.5 shrink-0 text-[var(--color-signal)]" />
          Confirm your current password and we&apos;ll email you a 6-digit code to approve the change.
        </p>

        <div>
          <label htmlFor="currentPassword" className={labelCx}>Current password</label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={inputCx}
          />
        </div>

        {reqState.error && (
          <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {reqState.error}
          </p>
        )}

        <button disabled={requesting} className="btn btn-primary disabled:opacity-60">
          <KeyRound size={16} /> {requesting ? "Sending code…" : "Send verification code"}
        </button>
      </form>
    );
  }

  return (
    <form action={confirmAction} className="space-y-4">
      {(reqState.ok || confState.ok) && !confState.error && (
        <p className="rounded-[10px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-4 py-3 text-sm text-[var(--color-signal)]">
          {confState.ok ?? reqState.ok}
        </p>
      )}

      {devCode && (
        <div className="rounded-[10px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-4 py-3 text-sm">
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

      <div>
        <label htmlFor="code" className={labelCx}>Verification code</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          required
          className={`${inputCx} text-center font-[family-name:var(--font-mono-src)] text-xl font-bold tracking-[.35em]`}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className={labelCx}>New password</label>
        <input id="newPassword" name="newPassword" type="password" minLength={8} required autoComplete="new-password" className={inputCx} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelCx}>Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" className={inputCx} />
      </div>

      {confState.error && (
        <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
          {confState.error}
        </p>
      )}

      <div className="flex gap-2">
        <button disabled={confirming} className="btn btn-primary disabled:opacity-60">
          {confirming ? "Changing…" : "Change password"}
        </button>
        <button type="button" onClick={() => setRestart(true)} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
