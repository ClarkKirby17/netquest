"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createAdmin, type SuperState } from "../actions";

const initial: SuperState = {};
const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.9rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function CreateAdminForm() {
  const [state, action, pending] = useActionState(createAdmin, initial);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="fullName" className={labelCx}>Full name</label>
        <input id="fullName" name="fullName" required minLength={2} placeholder="Maria Santos" className={inputCx} />
      </div>
      <div>
        <label htmlFor="email" className={labelCx}>Email</label>
        <input id="email" name="email" type="email" required placeholder="admin@school.edu" className={inputCx} />
      </div>
      <div>
        <label htmlFor="password" className={labelCx}>Initial password</label>
        <input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" className={inputCx} />
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          Share it securely — they can change it in Account settings.
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

      <button disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        <UserPlus size={16} /> {pending ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
