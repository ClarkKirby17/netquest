"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { requestPasswordReset, type ActionState } from "../actions";

const initial: ActionState = {};

export default function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          className="w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]"
        />
      </div>

      {state.error && (
        <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? "Sending…" : "Send reset code"} <ArrowRight size={16} />
      </button>
    </form>
  );
}
