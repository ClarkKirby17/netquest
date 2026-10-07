"use client";

import { useActionState, useEffect, useState } from "react";
import { setMissionImage, removeMissionImage } from "@/lib/mission-actions";

const MAX = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function MissionImageForm({
  id, scope, imagePath,
}: { id: number; scope: "mine" | "global"; imagePath: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(setMissionImage, {});

  /* After a successful save, show the saved image instead of the local preview. */
  useEffect(() => {
    if (state.ok) setPreview(null);
  }, [state]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null); setPreview(null);
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Use a PNG, JPG, WebP or GIF image.");
    if (f.size > MAX) return setError("Image must be 4 MB or smaller.");
    setPreview(URL.createObjectURL(f));
  }

  const shown = preview ?? imagePath;

  return (
    <div className="mt-4 rounded-[10px] border border-[var(--color-line)] p-3">
      <span className="mb-2 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
        Guide image (shown above the terminal)
      </span>

      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="Mission guide" className="mb-3 max-h-40 rounded-[10px] border border-[var(--color-line)]" />
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="folder" value="missions" />
        <input type="file" name="file" required onChange={onFile}
          accept={TYPES.join(",")} className="text-xs text-[var(--color-muted)]" />
        <button className="btn btn-ghost disabled:opacity-40" disabled={!!error || pending}>
          {pending ? "Uploading…" : imagePath ? "Replace image" : "Upload image"}
        </button>
      </form>
      {error && <p className="mt-1.5 text-xs text-[var(--color-alert)]">{error}</p>}
      {state.error && <p className="mt-1.5 text-xs text-[var(--color-alert)]">{state.error}</p>}
      {state.ok && <p className="mt-1.5 text-xs text-[var(--color-signal)]">Image saved.</p>}

      {imagePath && (
        <form action={removeMissionImage} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="scope" value={scope} />
          <button className="text-xs text-[var(--color-muted)] hover:text-[var(--color-alert)]">
            Remove image
          </button>
        </form>
      )}
    </div>
  );
}