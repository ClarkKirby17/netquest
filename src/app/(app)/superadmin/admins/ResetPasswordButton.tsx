"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetAdminPassword, type SuperState } from "../actions";

const initial: SuperState = {};

/* The temporary password appears once, inline — it is never emailed
   and never stored in readable form. */
export default function ResetPasswordButton({ id, name }: { id: number; name: string }) {
  const [state, action, pending] = useActionState(resetAdminPassword, initial);

  if (state.tempPassword) {
    return (
      <span className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-2.5 py-1">
        <span className="font-[family-name:var(--font-mono-src)] text-[.78rem] font-bold text-[var(--color-warn)]">
          {state.tempPassword}
        </span>
      </span>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        disabled={pending}
        title={`Issue a temporary password for ${name}`}
        className="btn btn-ghost px-2.5 py-1 text-[.78rem] disabled:opacity-50"
      >
        <KeyRound size={13} /> {pending ? "…" : "Reset"}
      </button>
    </form>
  );
}
