"use client";

import { useEffect, useState } from "react";
import type { Difficulty } from "@/db/schema";
import {
  TitleScreen, Countdown, Hud, HudItem, Summary, Stage,
  useArcadeSound, type SubmitResult } from "./shell";
import { cn } from "@/lib/utils";

export type DoorQuestion = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctOption: string;
  explanation: string;
};

const CONFIG: Record<
  Difficulty,
  { lives: number; seconds: number; perRoom: number; combo: number; desc: string }
> = {
  easy:   { lives: Infinity, seconds: 0,  perRoom: 80,  combo: 5,  desc: "Fundamentals. No lives, no timer — just doors." },
  medium: { lives: 3,        seconds: 20, perRoom: 90,  combo: 8,  desc: "Subnets and protocols. 3 lives, 20s per room." },
  hard:   { lives: 1,        seconds: 12, perRoom: 100, combo: 12, desc: "One life, 12 seconds, and the corridor darkens." } };

type Phase = "title" | "count" | "play" | "over";

export default function DoorChallenge({
  best,
  scoringLeft,
  fetchQuestions,
  submit,
}: {
  best: number;
  scoringLeft: number;
  fetchQuestions: (d: Difficulty) => Promise<DoorQuestion[]>;
  submit: (d: Difficulty, score: number) => Promise<SubmitResult>;
}) {
  const sound = useArcadeSound();
  const [phase, setPhase] = useState<Phase>("title");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questions, setQuestions] = useState<DoorQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState<number>(Infinity);
  const [timeLeft, setTimeLeft] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [shake, setShake] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);

  const cfg = CONFIG[difficulty];
  const q = questions[index];

  async function start(d: Difficulty) {
    setLoading(true);
    setDifficulty(d);
    const rows = await fetchQuestions(d);
    setLoading(false);
    if (rows.length === 0) return;

    setQuestions(rows);
    setIndex(0); setScore(0); setCorrect(0); setCombo(0); setMaxCombo(0);
    setLives(CONFIG[d].lives); setPicked(null); setFeedback(null); setResult(null);
    setPhase("count");
  }

  /* Per-room timer on medium and hard. */
  useEffect(() => {
    if (phase !== "play" || !cfg.seconds || picked) return;
    setTimeLeft(cfg.seconds);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          timeout();
          return 0;
        }
        if (t <= 4) sound.tick();
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, picked]);

  function advance(nextLives: number) {
    if (nextLives <= 0 || index + 1 >= questions.length) {
      finish();
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
      setFeedback(null);
    }
  }

  function choose(key: string) {
    if (picked || !q) return;
    setPicked(key);

    if (key === q.correctOption.toUpperCase()) {
      const nextCombo = combo + 1;
      const gained = cfg.perRoom + (nextCombo - 1) * cfg.combo + (cfg.seconds ? timeLeft * 2 : 0);
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setCorrect((c) => c + 1);
      setScore((s) => s + gained);
      setFlash("good");
      sound.good();
      setFeedback({ ok: true, text: q.explanation || "Correct — the door swings open." });
      setTimeout(() => { setFlash(null); advance(lives); }, 1500);
    } else {
      const nextLives = lives === Infinity ? Infinity : lives - 1;
      setCombo(0);
      setLives(nextLives);
      setFlash("bad");
      setShake(true);
      sound.bad();
      setFeedback({
        ok: false,
        text: `Door ${q.correctOption.toUpperCase()} was correct. ${q.explanation}` });
      setTimeout(() => { setShake(false); setFlash(null); }, 400);
      setTimeout(() => advance(nextLives), 1900);
    }
  }

  function timeout() {
    if (picked || !q) return;
    const nextLives = lives === Infinity ? Infinity : lives - 1;
    setPicked("timeout");
    setCombo(0);
    setLives(nextLives);
    setFlash("bad");
    setShake(true);
    sound.bad();
    setFeedback({
      ok: false,
      text: `Time ran out. Door ${q.correctOption.toUpperCase()} was correct. ${q.explanation}` });
    setTimeout(() => { setShake(false); setFlash(null); }, 400);
    setTimeout(() => advance(nextLives), 1900);
  }

  async function finish() {
    setPhase("over");
    const capped = Math.min(1000, score);
    setResult(await submit(difficulty, capped));
  }

  /* ─────────────── render ─────────────── */

  if (phase === "title") {
    return (
      <>
        <TitleScreen
          name="Door Challenge"
          tagline="three doors, one truth"
          blurb="A question hangs above three doors. Pick correctly and the corridor takes you deeper; pick wrong and it slams."
          best={best}
          scoringLeft={scoringLeft}
          descriptions={{ easy: CONFIG.easy.desc, medium: CONFIG.medium.desc, hard: CONFIG.hard.desc }}
          onStart={start}
        />
        {loading && (
          <p className="pb-8 text-center font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
            loading questions…
          </p>
        )}
      </>
    );
  }

  if (phase === "count") return <Countdown onDone={() => setPhase("play")} />;

  if (phase === "over") {
    return (
      <Summary
        score={Math.min(1000, score)}
        difficulty={difficulty}
        stats={[
          { label: "rooms cleared", value: `${correct}/${questions.length}` },
          { label: "best combo", value: `×${maxCombo}` },
        ]}
        result={result}
        onReplay={() => setPhase("title")}
      />
    );
  }

  if (!q) return null;

  const darkness = difficulty === "hard" ? Math.min(0.5, index * 0.055) : 0;
  const doors: [string, string][] = [
    ["A", q.optionA], ["B", q.optionB], ["C", q.optionC],
  ];

  return (
    <>
      <Hud>
        <HudItem label="room" value={`${index + 1}/${questions.length}`} />
        <HudItem label="score" value={Math.round(score)} tone="signal" />
        {combo > 1 && <HudItem label="combo" value={`×${combo}`} tone="warn" />}
        <HudItem
          label="lives"
          value={lives === Infinity ? "∞" : "❤".repeat(Math.max(0, lives))}
          tone={lives !== Infinity && lives <= 1 ? "alert" : "text"}
        />
        {cfg.seconds > 0 && (
          <span className="ml-auto">
            <HudItem label="time" value={`${timeLeft}s`} tone={timeLeft <= 4 ? "alert" : "text"} />
          </span>
        )}
      </Hud>

      <Stage shake={shake} flash={flash}>
        <div
          className="px-5 py-8 transition-colors duration-500"
          style={{ background: `rgba(0,0,0,${darkness})` }}
        >
          <p className="mx-auto max-w-xl text-center text-[1.05rem] leading-relaxed">
            {q.question}
          </p>

          <div className="door-scene mt-8 flex flex-wrap justify-center gap-5">
            {doors.map(([key, text]) => {
              const isCorrect = key === q.correctOption.toUpperCase();
              const isPicked = picked === key;
              return (
                <button
                  key={key}
                  onClick={() => choose(key)}
                  disabled={Boolean(picked)}
                  className={cn(
                    "door-panel flex w-[150px] flex-col items-center justify-center gap-3 rounded-t-lg border-2 border-[var(--color-line)] px-4 py-6",
                    "bg-gradient-to-b from-[#16233a] to-[#0d1626] disabled:cursor-default",
                    isPicked && isCorrect && "is-open",
                    isPicked && !isCorrect && "is-slam",
                    picked && !isPicked && isCorrect && "is-open"
                  )}
                  style={{ height: 210 }}
                >
                  <span className="font-[family-name:var(--font-display-src)] text-2xl font-bold text-[var(--color-warn)]">
                    {key}
                  </span>
                  <span className="text-center text-[.82rem] leading-snug text-[var(--color-muted)]">
                    {text}
                  </span>
                  <span className="absolute right-3 h-2.5 w-2.5 rounded-full bg-[var(--color-warn)]" />
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={cn(
                "mx-auto mt-7 max-w-xl rounded-[10px] border-l-2 px-5 py-3.5 text-sm",
                feedback.ok
                  ? "border-[var(--color-signal)] bg-[var(--color-signal-soft)] text-[var(--color-text)]"
                  : "border-[var(--color-alert)] bg-[rgba(255,77,109,.08)] text-[var(--color-text)]"
              )}
            >
              {feedback.text}
            </div>
          )}
        </div>
      </Stage>
    </>
  );
}
