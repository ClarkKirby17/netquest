"use client";

import { useActionState } from "react";
import { KeyRound, Copy, Check } from "lucide-react";
import { useState } from "react";

type State = { ok?: string; error?: string; tempPassword?: string };

/* The temporary password appears once, in the table, and is never
   emailed or stored in readable form. Copying it is one click because
   the alternative is people mistyping an eight-character string. */
export default function ResetPasswordInline({
  action,
  idName,
  id,
  name,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  idName: string;
  id: number;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);

  if (state.tempPassword) {
    return (
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(state.tempPassword!);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        title="Copy to clipboard"
        className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-2.5 py-1"
      >
        <span className="font-[family-name:var(--font-mono-src)] text-[.78rem] font-bold text-[var(--color-warn)]">
          {state.tempPassword}
        </span>
        {copied ? (
          <Check size={12} className="text-[var(--color-signal)]" />
        ) : (
          <Copy size={12} className="text-[var(--color-muted)]" />
        )}
      </button>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name={idName} value={id} />
      <button
        disabled={pending}
        title={`Issue a temporary password for ${name}`}
        className="btn btn-ghost px-2.5 py-1 text-[.78rem] disabled:opacity-50"
      >
        <KeyRound size={13} /> {pending ? "…" : "Reset"}
      </button>
      {state.error && (
        <span className="ml-2 text-[.7rem] text-[var(--color-alert)]">{state.error}</span>
      )}
    </form>
  );
}
