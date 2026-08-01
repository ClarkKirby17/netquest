"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type ActionState } from "../actions";

const initial: ActionState = {};

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Email" name="email" type="email" placeholder="you@school.edu" autoComplete="email" />
      <Field label="Password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />

      <div className="flex items-center justify-end pt-1">
        <Link
          href="/forgot-password"
          className="text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
        >
          Forgot password?
        </Link>
      </div>

      {state.error && (
        <p className="rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
      </button>
    </form>
  );
}

function Field({
  label, name, type, placeholder, autoComplete }: {
  label: string; name: string; type: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]"
      />
    </div>
  );
}
