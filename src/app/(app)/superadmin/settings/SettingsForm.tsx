"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Card, CardHead } from "@/components/ui";
import { saveSettings, type SuperState } from "../actions";
import type { SETTING_DEFAULTS } from "@/lib/settings";

const initial: SuperState = {};
const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function SettingsForm({
  values,
}: {
  values: Record<keyof typeof SETTING_DEFAULTS, string>;
}) {
  const [state, action, pending] = useActionState(saveSettings, initial);

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHead title="Access" sub="Who can join, and what they see first." />
        <div className="space-y-5 p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="registration_enabled"
              defaultChecked={values.registration_enabled === "1"}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-medium">Registration open</span>
              <span className="mt-0.5 block text-sm text-[var(--color-muted)]">
                When off, the sign-up page redirects to login with a notice. Existing accounts are unaffected.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="announcement" className={labelCx}>Login-page announcement</label>
            <textarea
              id="announcement"
              name="announcement"
              rows={3}
              maxLength={500}
              defaultValue={values.announcement}
              placeholder="e.g. Maintenance Saturday 10 PM — leave empty to hide the banner."
              className={inputCx}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Scoring" sub="Tune how points are earned." />
        <div className="space-y-5 p-5">
          <div>
            <label htmlFor="module_points" className={labelCx}>Points per completed module</label>
            <input
              id="module_points"
              name="module_points"
              type="number"
              min={0}
              max={10000}
              defaultValue={values.module_points}
              className={inputCx}
            />
          </div>

          <div>
            <label htmlFor="arcade_scoring_runs" className={labelCx}>
              Arcade scoring runs per game, per day
            </label>
            <input
              id="arcade_scoring_runs"
              name="arcade_scoring_runs"
              type="number"
              min={0}
              max={50}
              defaultValue={values.arcade_scoring_runs}
              className={inputCx}
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              Runs beyond this still earn XP — they just stop earning leaderboard points.
            </p>
          </div>
        </div>
      </Card>

      <div className="lg:col-span-2">
        {state.ok && (
          <p className="mb-3 rounded-[10px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-4 py-3 text-sm text-[var(--color-signal)]">
            {state.ok}
          </p>
        )}
        {state.error && (
          <p className="mb-3 rounded-[10px] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="btn btn-primary disabled:opacity-60">
          <Save size={16} /> {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
