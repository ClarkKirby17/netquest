"use client";

import { useActionState } from "react";
import { updateProfile, type AccountState } from "./actions";

const initial: AccountState = {};
const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors focus:border-[var(--color-signal)] disabled:opacity-50";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="fullName" className={labelCx}>Full name</label>
        <input id="fullName" name="fullName" defaultValue={fullName} required minLength={2} className={inputCx} />
      </div>

      <div>
        <label htmlFor="email" className={labelCx}>Email</label>
        <input id="email" value={email} disabled className={inputCx} />
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          Your email is your sign-in identity — contact an admin to change it.
        </p>
      </div>

      {state.ok && (
        <p className="rounded-[10px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-4 py-3 text-sm text-[var(--color-signal)]">
          {state.ok}
        </p>
      )}
      {state.error && (
        <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
          {state.error}
        </p>
      )}

      <button disabled={pending} className="btn btn-primary disabled:opacity-60">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
