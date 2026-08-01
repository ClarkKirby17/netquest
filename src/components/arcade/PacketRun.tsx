"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/db/schema";
import {
  TitleScreen, Countdown, Hud, HudItem, Summary,
  useArcadeSound, type SubmitResult } from "./shell";

/* Packet Run — you are a packet crossing a congested link.
   Jump collisions, duck broadcast storms. The networking content is
   in what the obstacles are: each one is a real failure mode, named. */

type Phase = "title" | "count" | "play" | "over";

const CONFIG: Record<
  Difficulty,
  { speed: number; gravity: number; spawn: number; desc: string }
> = {
  easy:   { speed: 4.4, gravity: 0.62, spawn: 105, desc: "Steady link. Room to react between hazards." },
  medium: { speed: 5.8, gravity: 0.72, spawn: 80,  desc: "Busy link. Hazards come closer together." },
  hard:   { speed: 7.4, gravity: 0.84, spawn: 58,  desc: "Saturated link. Barely a gap between drops." } };

const HAZARDS = [
  { label: "COLLISION", color: "#ff4d6d", kind: "ground" as const },
  { label: "CRC ERROR", color: "#ff8a4d", kind: "ground" as const },
  { label: "BROADCAST STORM", color: "#00c9ff", kind: "air" as const },
  { label: "TTL=0", color: "#c792ea", kind: "ground" as const },
];

const W = 760;
const H = 260;
const GROUND = H - 46;

export default function PacketRun({
  best,
  scoringLeft,
  submit }: {
  best: number;
  scoringLeft: number;
  submit: (d: Difficulty, score: number) => Promise<SubmitResult>;
}) {
  const sound = useArcadeSound();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [hops, setHops] = useState(0);
  const [dodged, setDodged] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);

  /* Mutable game state kept in a ref — React state would re-render
     every frame and tank the loop. */
  const game = useRef({
    y: GROUND, vy: 0, ducking: false, running: false,
    distance: 0, dodged: 0, frame: 0,
    obstacles: [] as { x: number; w: number; h: number; kind: "ground" | "air"; label: string; color: string; passed: boolean }[],
    cfg: CONFIG.easy });

  const finish = useCallback(async () => {
    game.current.running = false;
    const g = game.current;
    /* distance is the score driver; dodging adds a bonus */
    const raw = Math.round(g.distance / 6 + g.dodged * 22);
    const score = Math.max(0, Math.min(1000, raw));
    setHops(Math.round(g.distance / 40));
    setDodged(g.dodged);
    setPhase("over");
    setResult(await submit(difficulty, score));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const jump = useCallback(() => {
    const g = game.current;
    if (!g.running) return;
    if (g.y >= GROUND) {
      g.vy = -11.5;
      sound.click();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDuck = useCallback((on: boolean) => {
    game.current.ducking = on;
  }, []);

  /* input */
  useEffect(() => {
    if (phase !== "play") return;
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      if (e.code === "ArrowDown") { e.preventDefault(); setDuck(true); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") setDuck(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, jump, setDuck]);

  /* main loop */
  useEffect(() => {
    if (phase !== "play") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const g = game.current;
    g.cfg = CONFIG[difficulty];
    g.y = GROUND; g.vy = 0; g.ducking = false;
    g.distance = 0; g.dodged = 0; g.frame = 0;
    g.obstacles = []; g.running = true;

    let raf = 0;

    const loop = () => {
      if (!g.running) return;
      g.frame++;
      g.distance += g.cfg.speed;

      /* physics */
      g.vy += g.cfg.gravity;
      g.y = Math.min(GROUND, g.y + g.vy);
      if (g.y >= GROUND) g.vy = 0;

      /* spawn */
      if (g.frame % g.cfg.spawn === 0) {
        const h = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
        g.obstacles.push({
          x: W + 20,
          w: h.kind === "air" ? 54 : 22,
          h: h.kind === "air" ? 26 : 34 + Math.random() * 16,
          kind: h.kind,
          label: h.label,
          color: h.color,
          passed: false });
      }

      /* move + collide */
      const packetH = g.ducking ? 14 : 24;
      const packetY = g.y - packetH;
      for (const o of g.obstacles) {
        o.x -= g.cfg.speed;
        const oy = o.kind === "air" ? GROUND - 74 : GROUND - o.h;
        const hit =
          60 + 22 > o.x && 60 < o.x + o.w &&
          packetY < oy + o.h && packetY + packetH > oy;
        if (hit) { sound.bad(); finish(); return; }
        if (!o.passed && o.x + o.w < 60) { o.passed = true; g.dodged++; sound.tick(); }
      }
      g.obstacles = g.obstacles.filter((o) => o.x > -80);

      /* ── draw ── */
      ctx.clearRect(0, 0, W, H);

      /* the wire */
      ctx.strokeStyle = "#1e2c44";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, GROUND + 2); ctx.lineTo(W, GROUND + 2); ctx.stroke();

      /* scrolling ticks so speed reads visually */
      ctx.strokeStyle = "rgba(0,201,255,.25)";
      ctx.lineWidth = 1;
      for (let x = -(g.distance % 60); x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, GROUND + 8); ctx.lineTo(x + 22, GROUND + 8); ctx.stroke();
      }

      /* obstacles */
      for (const o of g.obstacles) {
        const oy = o.kind === "air" ? GROUND - 74 : GROUND - o.h;
        ctx.fillStyle = o.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(o.x, oy, o.w, o.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#8fa7c4";
        ctx.font = "9px ui-monospace, monospace";
        ctx.fillText(o.label, o.x - 6, oy - 7);
      }

      /* the packet */
      ctx.fillStyle = "#00f5a0";
      ctx.shadowColor = "#00f5a0";
      ctx.shadowBlur = 12;
      ctx.fillRect(60, packetY, 22, packetH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#04090f";
      ctx.font = "bold 8px ui-monospace, monospace";
      if (!g.ducking) ctx.fillText("PKT", 63, packetY + 15);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { g.running = false; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, difficulty]);

  /* ─────────────── render ─────────────── */

  if (phase === "title") {
    return (
      <TitleScreen
        name="Packet Run"
        tagline="you are the packet"
        blurb="Ride a congested link. Jump collisions, duck broadcast storms, and see how far down the wire you get before you're dropped."
        best={best}
        scoringLeft={scoringLeft}
        descriptions={{ easy: CONFIG.easy.desc, medium: CONFIG.medium.desc, hard: CONFIG.hard.desc }}
        onStart={(d) => { setDifficulty(d); setResult(null); setPhase("count"); }}
      />
    );
  }

  if (phase === "count") return <Countdown onDone={() => setPhase("play")} />;

  if (phase === "over") {
    return (
      <Summary
        score={Math.min(1000, Math.round(game.current.distance / 6 + game.current.dodged * 22))}
        difficulty={difficulty}
        stats={[
          { label: "hops travelled", value: hops },
          { label: "hazards dodged", value: dodged },
        ]}
        result={result}
        onReplay={() => setPhase("title")}
      />
    );
  }

  return (
    <>
      <Hud>
        <HudItem label="link" value={difficulty} />
        <HudItem label="dodged" value={game.current.dodged} tone="signal" />
        <span className="ml-auto text-[var(--color-muted)]">
          space / ↑ jump · ↓ duck
        </span>
      </Hud>

      <div className="flex justify-center bg-[#04090f] px-4 py-8">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          className="max-w-full cursor-pointer rounded-[10px] border border-[var(--color-line)]"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      <div className="flex justify-center gap-3 pb-6 sm:hidden">
        <button onMouseDown={jump} onTouchStart={jump} className="btn btn-primary">Jump</button>
        <button
          onTouchStart={() => setDuck(true)}
          onTouchEnd={() => setDuck(false)}
          className="btn btn-ghost"
        >
          Duck
        </button>
      </div>
    </>
  );
}
