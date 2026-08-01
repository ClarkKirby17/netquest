"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft, Trophy, Zap } from "lucide-react";
import type { Difficulty } from "@/db/schema";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════════════════════
   ARCADE SHELL
   Every game gets the same title screen, countdown, HUD and
   summary — so a run feels like a run whichever game it is.
   ══════════════════════════════════════════════════════════════ */

/* ─────────────────────────── sound ─────────────────────────── */

export function useArcadeSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (freq: number, dur: number, type: OscillatorType = "sine", vol = 0.06, delay = 0) => {
      const c = ctx();
      if (!c) return;
      const t = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    [ctx]
  );

  return {
    click: () => tone(600, 0.06, "square", 0.04),
    good: () => { tone(660, 0.12); tone(880, 0.16, "sine", 0.06, 0.08); },
    great: () => { tone(660, 0.1); tone(880, 0.1, "sine", 0.06, 0.07); tone(1174, 0.2, "sine", 0.06, 0.14); },
    bad: () => { tone(180, 0.25, "sawtooth", 0.06); tone(120, 0.3, "sawtooth", 0.05, 0.05); },
    tick: () => tone(880, 0.04, "square", 0.03),
    type: () => tone(320 + Math.random() * 120, 0.02, "square", 0.012),
    levelUp: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "sine", 0.06, i * 0.09)) };
}

/* ─────────────────────── difficulty picker ─────────────────────── */

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; multiplier: string; accent: string }
> = {
  easy: { label: "Easy", multiplier: "×1.0", accent: "var(--color-signal)" },
  medium: { label: "Medium", multiplier: "×1.5", accent: "var(--color-warn)" },
  hard: { label: "Hard", multiplier: "×2.0", accent: "var(--color-alert)" } };

export function TitleScreen({
  name,
  tagline,
  blurb,
  best,
  scoringLeft,
  descriptions,
  onStart,
}: {
  name: string;
  tagline: string;
  blurb: string;
  best: number;
  scoringLeft: number;
  descriptions: Record<Difficulty, string>;
  onStart: (d: Difficulty) => void;
}) {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center">
      <span className="nq-eyebrow">{tagline}</span>
      <h1 className="mt-4 font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
        {name}
      </h1>
      <p className="mt-3 max-w-md text-[var(--color-muted)]">{blurb}</p>

      <div className="mt-9 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => {
          const meta = DIFFICULTY_META[d];
          return (
            <button
              key={d}
              onClick={() => onStart(d)}
              className="group rounded-[14px] border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-6 text-left transition-all duration-150 hover:-translate-y-1"
              style={{ borderColor: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = meta.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
            >
              <div
                className="font-[family-name:var(--font-display-src)] text-lg font-bold"
                style={{ color: meta.accent }}
              >
                {meta.label}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
                {descriptions[d]}
              </p>
              <div className="mt-3 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-warn)]">
                {meta.multiplier} points
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <Trophy size={13} className="text-[var(--color-warn)]" /> best {best}/1000
        </span>
        <span className={scoringLeft > 0 ? "" : "text-[var(--color-alert)]"}>
          {scoringLeft} scoring run{scoringLeft === 1 ? "" : "s"} left today
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── countdown ───────────────────────── */

export function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const sound = useArcadeSound();

  useEffect(() => {
    sound.tick();
    if (n <= 0) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((v) => v - 1), 780);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div className="flex min-h-[520px] items-center justify-center">
      <div
        key={n}
        className="font-[family-name:var(--font-display-src)] text-8xl font-bold text-[var(--color-signal)]"
        style={{
          animation: "arc-pop .7s ease both",
          textShadow: "0 0 50px rgba(0,245,160,.5)" }}
      >
        {n > 0 ? n : "GO"}
      </div>
    </div>
  );
}

/* ─────────────────────────── HUD ─────────────────────────── */

export function Hud({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[var(--color-line)] bg-[var(--color-deep)] px-5 py-3 font-[family-name:var(--font-mono-src)] text-xs">
      {children}
    </div>
  );
}

export function HudItem({
  label, value, tone = "text" }: {
  label: string;
  value: React.ReactNode;
  tone?: "text" | "signal" | "warn" | "alert";
}) {
  const color = {
    text: "var(--color-text)",
    signal: "var(--color-signal)",
    warn: "var(--color-warn)",
    alert: "var(--color-alert)" }[tone];
  return (
    <span className="flex items-center gap-2">
      <span className="uppercase tracking-[.14em] text-[var(--color-muted)]">{label}</span>
      <b style={{ color }} className="text-sm font-bold">{value}</b>
    </span>
  );
}

/* ────────────────────────── summary ────────────────────────── */

export function rankFor(score: number) {
  if (score >= 900) return "S";
  if (score >= 750) return "A";
  if (score >= 550) return "B";
  if (score >= 350) return "C";
  return "D";
}

export type SubmitResult = {
  score: number;
  xpGained: number;
  pointsEarned: number;
  capped: boolean;
  runsLeftToday: number;
  bestScore: number;
  newRecord: boolean;
  level: { level: number; leveledUp: boolean };
  newBadges: { name: string; icon: string }[];
};

export function Summary({
  score,
  difficulty,
  stats,
  result,
  onReplay,
}: {
  score: number;
  difficulty: Difficulty;
  stats: { label: string; value: React.ReactNode }[];
  result: SubmitResult | null;
  onReplay: () => void;
}) {
  const [shown, setShown] = useState(0);
  const sound = useArcadeSound();

  /* Count the score up rather than dropping it on screen. */
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
      else sound.great();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center">
      <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.2em] text-[var(--color-muted)]">
        run complete · {difficulty}
      </span>

      <div
        className="mt-3 font-[family-name:var(--font-display-src)] text-7xl font-bold leading-none"
        style={{
          background: "linear-gradient(135deg,#f6a821,#ffe29a)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent" }}
      >
        {rankFor(score)}
      </div>

      <div className="mt-2 font-[family-name:var(--font-display-src)] text-5xl font-bold">
        {shown}
      </div>
      <div className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
        out of 1000
      </div>

      {result?.newRecord && (
        <div className="mt-3 font-[family-name:var(--font-mono-src)] text-sm font-bold tracking-[.15em] text-[var(--color-signal)]">
          ★ NEW RECORD ★
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-8">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-[family-name:var(--font-display-src)] text-xl font-bold">
              {s.value}
            </div>
            <div className="font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 min-h-[3rem] text-sm">
        {!result ? (
          <span className="text-[var(--color-muted)]">Saving your run…</span>
        ) : (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 font-semibold text-[var(--color-wire)]">
                <Zap size={14} /> +{result.xpGained} XP
              </span>
              {result.capped ? (
                <span className="text-[var(--color-warn)]">
                  daily scoring runs used — XP still counts
                </span>
              ) : (
                <span className="font-semibold text-[var(--color-warn)]">
                  +{result.pointsEarned} points
                  <span className="ml-2 font-normal text-[var(--color-muted)]">
                    · {result.runsLeftToday} scoring run{result.runsLeftToday === 1 ? "" : "s"} left
                  </span>
                </span>
              )}
            </div>
            {result.level.leveledUp && (
              <div className="font-semibold text-[var(--color-signal)]">
                ⭐ Level up — you&apos;re now level {result.level.level}
              </div>
            )}
            {result.newBadges.map((b) => (
              <div key={b.name} className="text-[var(--color-warn)]">
                🏅 Badge earned: <b>{b.name}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={onReplay} className="btn btn-primary">
          <RotateCcw size={16} /> Play again
        </button>
        <Link href="/student/arcade" className="btn btn-ghost">
          <ArrowLeft size={16} /> Arcade
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────── stage wrapper + fx ───────────────────── */

export function Stage({
  children,
  shake,
  flash,
}: {
  children: React.ReactNode;
  shake?: boolean;
  flash?: "good" | "bad" | null;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", shake && "arc-shake")}
      style={{ minHeight: 420 }}
    >
      {flash && (
        <div
          className="pointer-events-none absolute inset-0 z-40"
          style={{
            background:
              flash === "bad" ? "rgba(255,77,109,.16)" : "rgba(0,245,160,.13)",
            animation: "arc-fade .45s forwards" }}
        />
      )}
      {children}
    </div>
  );
}
