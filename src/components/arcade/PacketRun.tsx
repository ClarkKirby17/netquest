"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/db/schema";
import {
  TitleScreen, Countdown, Hud, HudItem, Summary,
  useArcadeSound, type SubmitResult } from "./shell";

/* Packet Run — you are a packet with a destination address.
   Cross a congested link (jump collisions, duck broadcast storms) and at
   every router pick the correct next hop by longest-prefix match
   before your TTL runs out. */

type Phase = "title" | "count" | "play" | "over";
type Lane = "up" | "down";
type Outcome = "dropped" | "expired" | "delivered";
type Note = { tone: "info" | "ok" | "bad"; text: string };

type Route = { prefix: string; hop: string };
type Gate = {
  x: number; w: number; router: string;
  up: Route; down: Route; correct: Lane;
  why: string; resolved: boolean;
};
type Obstacle = {
  x: number; w: number; h: number; kind: "ground" | "air";
  label: string; color: string; why: string; passed: boolean;
};

const CONFIG: Record<
  Difficulty,
  { speed: number; gravity: number; spawn: number; gateEvery: number; gates: number; desc: string }
> = {
  easy:   { speed: 4.4, gravity: 0.62, spawn: 105, gateEvery: 300, gates: 6,
            desc: "Short path, clear routing tables. One wrong turn is survivable." },
  medium: { speed: 5.8, gravity: 0.72, spawn: 80,  gateEvery: 250, gates: 7,
            desc: "Busier link. Overlapping routes: the longest matching prefix wins." },
  hard:   { speed: 7.4, gravity: 0.84, spawn: 58,  gateEvery: 210, gates: 8,
            desc: "Saturated link, tricky tables. Longer prefixes can be traps." } };

const HAZARDS = [
  { label: "COLLISION", color: "#ff4d6d", kind: "ground" as const,
    why: "two hosts transmitted at once on a shared segment (CSMA/CD)." },
  { label: "CRC ERROR", color: "#ff8a4d", kind: "ground" as const,
    why: "the frame check sequence didn't match, so the NIC discarded the frame." },
  { label: "BROADCAST STORM", color: "#00c9ff", kind: "air" as const,
    why: "a broadcast loop flooded the segment. Duck under it." },
  { label: "QUEUE DROP", color: "#c792ea", kind: "ground" as const,
    why: "the router's buffer was full, so it tail-dropped you." },
];

const W = 760;
const H = 260;
const GROUND = H - 46;
const GATE_W = 150;
const PKT_X = 60;
const PKT_W = 22;

/* ───────── routing helpers ───────── */

const rnd = (n: number) => Math.floor(Math.random() * n);
const other = (n: number, max: number) => {
  let v = 1 + rnd(max);
  while (v === n) v = 1 + rnd(max);
  return v;
};

function makeDst() {
  return [10, 1 + rnd(200), 1 + rnd(200), 1 + rnd(250)];
}
const dstStr = (d: number[]) => d.join(".");

const matching = (d: number[], len: 24 | 16) =>
  len === 24 ? `10.${d[1]}.${d[2]}.0/24` : `10.${d[1]}.0.0/16`;

const nonMatching = (d: number[], len: 24 | 16) =>
  len === 24 ? `10.${d[1]}.${other(d[2], 200)}.0/24` : `10.${other(d[1], 200)}.0.0/16`;

const lessSpecific = (d: number[], len: 24 | 16) => {
  const opts = len === 24 ? ["10." + d[1] + ".0.0/16", "10.0.0.0/8", "0.0.0.0/0"] : ["10.0.0.0/8", "0.0.0.0/0"];
  return opts[rnd(opts.length)];
};

function makeGate(dst: number[], diff: Difficulty, idx: number): Gate {
  const r = Math.random();
  const longLen: 24 | 16 = Math.random() < 0.5 ? 24 : 16;
  let good: string, bad: string, why: string;
  const ip = dstStr(dst);

  if (diff === "hard" && r < 0.3) {
    /* trap: a /24 that looks more specific but doesn't contain dst */
    good = matching(dst, 16);
    bad = nonMatching(dst, 24);
    why = `${bad} looks more specific but doesn't contain ${ip}. Only matching routes count.`;
  } else if (diff !== "easy" && r < (diff === "medium" ? 0.5 : 0.85)) {
    good = matching(dst, longLen);
    bad = lessSpecific(dst, longLen);
    why = `both routes match ${ip}, but ${good} is more specific. Longest prefix wins.`;
  } else {
    good = matching(dst, longLen);
    bad = nonMatching(dst, longLen);
    why = `${good} contains ${ip}; ${bad} doesn't.`;
  }

  const hopA = `R${2 + rnd(8)}`;
  let hopB = `R${2 + rnd(8)}`;
  while (hopB === hopA) hopB = `R${2 + rnd(8)}`;
  const goodUp = Math.random() < 0.5;

  return {
    x: W + 20, w: GATE_W, router: `R${idx + 1}`,
    up: { prefix: goodUp ? good : bad, hop: goodUp ? hopA : hopB },
    down: { prefix: goodUp ? bad : good, hop: goodUp ? hopB : hopA },
    correct: goodUp ? "up" : "down",
    why, resolved: false };
}

/* ───────── component ───────── */

export default function PacketRun({
  best,
  scoringLeft,
  submit,
}: {
  best: number;
  scoringLeft: number;
  submit: (d: Difficulty, score: number) => Promise<SubmitResult>;
}) {
  const sound = useArcadeSound();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [result, setResult] = useState<SubmitResult | null>(null);

  /* live HUD + teaching feed (updated on events only, never per-frame) */
  const [hud, setHud] = useState({ dodged: 0, ttl: 0, hop: 0 });
  const [dst, setDst] = useState("");
  const [note, setNote] = useState<Note>({ tone: "info", text: "" });

  /* end-of-run numbers */
  const [final, setFinal] = useState({ score: 0, hops: 0, correct: 0, dodged: 0, ttl: 0 });

  /* Mutable game state kept in a ref — React state would re-render
     every frame and tank the loop. */
  const game = useRef({
    y: GROUND, vy: 0, ducking: false, running: false,
    dodged: 0, frame: 0,
    hops: 0, correct: 0, ttl: 0,
    dst: [10, 0, 0, 0] as number[],
    gates: [] as Gate[], spawnedGates: 0, gateTimer: 0,
    obstacles: [] as Obstacle[],
    cfg: CONFIG.easy });

  const finish = useCallback(async (outcome: Outcome, message: string) => {
    const g = game.current;
    if (!g.running) return;
    g.running = false;

    /* routing correctness is the main score driver; delivery pays a bonus */
    const raw =
      g.correct * 90 + g.dodged * 10 +
      (outcome === "delivered" ? 150 + Math.max(0, g.ttl) * 20 : 0);
    const score = Math.max(0, Math.min(1000, raw));

    setNote({ tone: outcome === "delivered" ? "ok" : "bad", text: message });
    setFinal({ score, hops: g.hops, correct: g.correct, dodged: g.dodged, ttl: Math.max(0, g.ttl) });

    /* hold the frozen frame briefly so the player can read why it ended */
    await new Promise((r) => setTimeout(r, 1700));
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
    g.dodged = 0; g.frame = 0;
    g.hops = 0; g.correct = 0; g.ttl = g.cfg.gates + 4;
    g.dst = makeDst();
    g.gates = []; g.spawnedGates = 0; g.gateTimer = 150;
    g.obstacles = []; g.running = true;

    const ip = dstStr(g.dst);
    setDst(ip);
    setHud({ dodged: 0, ttl: g.ttl, hop: 0 });
    setNote({
      tone: "info",
      text: `You are a packet bound for ${ip}. At each router, jump for the upper route or stay low for the lower. Pick the longest prefix that contains ${ip}.` });

    const sync = () => setHud({ dodged: g.dodged, ttl: g.ttl, hop: g.hops });
    const obstacleY = (o: Obstacle) => (o.kind === "air" ? GROUND - 52 : GROUND - o.h);

    const UP_Y = GROUND - 128, UP_H = 72, DN_Y = GROUND - 50, DN_H = 50;
    const MONO = "ui-monospace, monospace";

    const drawGate = (gt: Gate) => {
      const laneColor = (lane: Lane) =>
        !gt.resolved ? "#00c9ff" : lane === gt.correct ? "#00f5a0" : "#3a2330";

      ctx.fillStyle = "rgba(0,201,255,.05)";
      ctx.fillRect(gt.x, UP_Y - 16, gt.w, GROUND - UP_Y + 16);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = laneColor("up");   ctx.strokeRect(gt.x, UP_Y, gt.w, UP_H);
      ctx.strokeStyle = laneColor("down"); ctx.strokeRect(gt.x, DN_Y, gt.w, DN_H);

      ctx.font = `bold 9px ${MONO}`;
      ctx.fillStyle = "#00c9ff";
      ctx.fillText(`ROUTER ${gt.router} · NEXT HOP?`, gt.x, UP_Y - 5);

      const lane = (r: Route, y: number, hint: string) => {
        ctx.font = `10px ${MONO}`;
        ctx.fillStyle = "#cfe3ff";
        ctx.fillText(r.prefix, gt.x + 8, y + 20);
        ctx.font = `9px ${MONO}`;
        ctx.fillStyle = "#8fa7c4";
        ctx.fillText(`via ${r.hop} · ${hint}`, gt.x + 8, y + 34);
      };
      lane(gt.up, UP_Y + 6, "↑ jump");
      lane(gt.down, DN_Y + 4, "stay low");
    };

    let raf = 0;

    const loop = () => {
      if (!g.running) return;
      g.frame++;

      /* physics */
      g.vy += g.cfg.gravity;
      g.y = Math.min(GROUND, g.y + g.vy);
      if (g.y >= GROUND) g.vy = 0;

      /* spawn a router once the lane ahead is clear of hazards */
      g.gateTimer--;
      if (
        g.gateTimer <= 0 &&
        g.spawnedGates < g.cfg.gates &&
        !g.obstacles.some((o) => o.x > W - 240)
      ) {
        g.gates.push(makeGate(g.dst, difficulty, g.spawnedGates));
        g.spawnedGates++;
        g.gateTimer = g.cfg.gateEvery;
      }

      /* spawn hazards, but leave a clean runway after each router */
      if (g.frame % g.cfg.spawn === 0 && !g.gates.some((gt) => gt.x > W - 400)) {
        const h = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
        g.obstacles.push({
          x: W + 20,
          w: h.kind === "air" ? 54 : 22,
          h: h.kind === "air" ? 34 : 34 + Math.random() * 16,
          kind: h.kind, label: h.label, color: h.color, why: h.why,
          passed: false });
      }

      /* routers: the lane you're in at the router's centre is the route you took */
      for (const gt of g.gates) {
        gt.x -= g.cfg.speed;
        if (!gt.resolved && gt.x + gt.w / 2 <= PKT_X + PKT_W / 2) {
          gt.resolved = true;
          const taken: Lane = g.y < GROUND - 36 ? "up" : "down";
          g.hops++;
          g.ttl -= 1; /* every router decrements TTL */
          if (taken === gt.correct) {
            g.correct++;
            sound.tick();
            setNote({ tone: "ok", text: `${gt.router}: ✓ ${gt.why}` });
          } else {
            g.ttl -= 3; /* detour through extra routers */
            sound.bad();
            setNote({ tone: "bad", text: `${gt.router}: ✗ wrong next hop: ${gt.why} Detour costs 3 extra TTL.` });
          }
          sync();

          if (g.ttl <= 0) {
            finish("expired", "TTL expired. A router discarded the packet and sent back ICMP Time Exceeded.");
            return;
          }
          if (g.hops >= g.cfg.gates) {
            finish("delivered", `Delivered! Your packet reached ${ip} with TTL ${g.ttl} to spare.`);
            return;
          }
        }
      }
      g.gates = g.gates.filter((gt) => gt.x > -gt.w - 20);

      /* hazards: move + collide */
      const packetH = g.ducking ? 14 : 24;
      const packetY = g.y - packetH;
      for (const o of g.obstacles) {
        o.x -= g.cfg.speed;
        const oy = obstacleY(o);
        const hit =
          PKT_X + PKT_W > o.x && PKT_X < o.x + o.w &&
          packetY < oy + o.h && packetY + packetH > oy;
        if (hit) {
          sound.bad();
          finish("dropped", `Dropped by ${o.label}: ${o.why}`);
          return;
        }
        if (!o.passed && o.x + o.w < PKT_X) {
          o.passed = true; g.dodged++; sound.tick(); sync();
        }
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
      for (let x = -((g.frame * g.cfg.speed) % 60); x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, GROUND + 8); ctx.lineTo(x + 22, GROUND + 8); ctx.stroke();
      }

      /* routers */
      for (const gt of g.gates) drawGate(gt);

      /* hazards */
      for (const o of g.obstacles) {
        const oy = obstacleY(o);
        ctx.fillStyle = o.color;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(o.x, oy, o.w, o.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#8fa7c4";
        ctx.font = `9px ${MONO}`;
        ctx.fillText(o.label, o.x - 6, oy - 7);
      }

      /* the packet */
      ctx.fillStyle = "#00f5a0";
      ctx.shadowColor = "#00f5a0";
      ctx.shadowBlur = 12;
      ctx.fillRect(PKT_X, packetY, PKT_W, packetH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#04090f";
      ctx.font = `bold 8px ${MONO}`;
      if (!g.ducking) ctx.fillText("PKT", PKT_X + 3, packetY + 15);

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
        blurb="Cross a congested link with a destination address and a TTL. Jump collisions, duck broadcast storms, and at every router pick the right next hop by longest-prefix match before you're dropped."
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
        score={final.score}
        difficulty={difficulty}
        stats={[
          { label: "routers crossed", value: final.hops },
          { label: "correct next hops", value: final.correct },
          { label: "hazards dodged", value: final.dodged },
          { label: "TTL left", value: final.ttl },
        ]}
        result={result}
        onReplay={() => setPhase("title")}
      />
    );
  }

  const noteColor =
    note.tone === "ok" ? "#00f5a0" : note.tone === "bad" ? "#ff4d6d" : "#8fa7c4";

  return (
    <>
      <Hud>
        <HudItem label="dst" value={dst} />
        <HudItem label="ttl" value={hud.ttl} tone="signal" />
        <HudItem label="router" value={`${hud.hop}/${CONFIG[difficulty].gates}`} />
        <HudItem label="dodged" value={hud.dodged} />
        <span className="ml-auto text-[var(--color-muted)]">
          space / ↑ jump · ↓ duck
        </span>
      </Hud>

      <div className="flex justify-center bg-[#04090f] px-4 pt-8 pb-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={jump}
          className="max-w-full cursor-pointer rounded-[10px] border border-[var(--color-line)]"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* teaching feed: why each router decision / drop happened */}
      <div className="flex justify-center bg-[#04090f] px-4 pb-6">
        <p
          className="w-full max-w-[760px] rounded-[10px] border px-4 py-3 font-mono text-[12px] leading-relaxed"
          style={{ borderColor: noteColor, color: noteColor }}
        >
          {note.text}
        </p>
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