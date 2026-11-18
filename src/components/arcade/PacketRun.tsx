"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Difficulty } from "@/db/schema";
import {
  TitleScreen, Countdown, Hud, HudItem, Summary,
  useArcadeSound, type SubmitResult } from "./shell";

const DEBUG_HITBOX = false;

const SPRITES = {
  ground: "/packet-run/cactus.png",
  air: "/packet-run/bird.png",
  packet: "/packet-run/mukhanimj.png",
};

/* ── SIZES: change these to make things bigger or smaller ── */
const SIZE = {
  groundH: 70,   // cactus height
  airH: 52,      // bird height
  pktH: 56,      // packet height, standing
  pktDuckH: 30,  // packet height, ducking
};

/* width used only until/unless the PNG is available */
const FALLBACK_W = { ground: 36, air: 84, pkt: 40 };

/* hitbox insets as a FRACTION of the sprite (0.2 = 20% cut off that side) */
type Inset = { l: number; r: number; t: number; b: number };
const HIT: Record<"ground" | "air" | "pkt", Inset> = {
  ground: { l: 0.22, r: 0.22, t: 0.14, b: 0.02 },
  air:    { l: 0.15, r: 0.15, t: 0.20, b: 0.15 },
  pkt:    { l: 0.24, r: 0.24, t: 0.14, b: 0.02 } };

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
type Decision = { gate: Gate; deadline: number; lockUntil: number };

/* speed   = pixels per frame (lower = slower)
   decide  = milliseconds the player has to answer at each router */
const CONFIG: Record<
  Difficulty,
  { speed: number; gravity: number; spawn: number; gateEvery: number; gates: number; decide: number; desc: string }
> = {
  easy:   { speed: 6, gravity: 0.5, spawn: 90, gateEvery: 300, gates: 6, decide: 9000,
            desc: "Short path, clear routing tables. One wrong turn is survivable." },
  medium: { speed: 6, gravity: 0.5, spawn: 70, gateEvery: 250, gates: 7, decide: 7000,
            desc: "Busier link. Overlapping routes: the longest matching prefix wins." },
  hard:   { speed: 6.0, gravity: 0.5, spawn: 52, gateEvery: 210, gates: 8, decide: 5000,
            desc: "Saturated link, tricky tables. Longer prefixes can be traps." } };

const JUMP_V = -12.5; /* jump strength (more negative = higher) */

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
const AIR_BOTTOM = GROUND - 30; /* underside of the bird sprite */

/* Clear ground needed in front of the packet before a router may pause the
   game. When the player answers, the world resumes at full speed, so a
   hazard closer than this would leave no time to react (a jump lasts ~50
   frames, i.e. ~300px at speed 6). Raise it for more breathing room. */
const SAFE_GAP = 300;

/* Router lanes: two boxes of the SAME size, stacked with a small gap.
   Shared at module level so both the drawing code and the mouse
   hit-testing use the exact same rectangles. */
const LANE_H = 62;
const LANE_GAP = 8;
const DN_Y = GROUND - LANE_H;
const UP_Y = DN_Y - LANE_GAP - LANE_H;

/* ───────── sprite + hitbox helpers ───────── */

const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0;

/* Find the solid, visible part of a PNG so empty padding, glows and soft
   shadows are ignored. Result is cached per image. */
type Crop = { sx: number; sy: number; sw: number; sh: number };
const cropCache = new WeakMap<HTMLImageElement, Crop>();
const SOLID_ALPHA = 128; /* pixels fainter than this (0-255) don't count */

function cropOf(im: HTMLImageElement): Crop {
  const cached = cropCache.get(im);
  if (cached) return cached;

  const full: Crop = { sx: 0, sy: 0, sw: im.naturalWidth, sh: im.naturalHeight };
  let out = full;
  try {
    const w = im.naturalWidth;
    const h = im.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d");
    if (cx) {
      cx.drawImage(im, 0, 0);
      const data = cx.getImageData(0, 0, w, h).data;
      const rows = new Array<number>(h).fill(0);
      const cols = new Array<number>(w).fill(0);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > SOLID_ALPHA) { rows[y]++; cols[x]++; }
        }
      }
      /* ignore stray specks: a row/column must have a few solid pixels */
      const minRow = Math.max(1, Math.round(w * 0.03));
      const minCol = Math.max(1, Math.round(h * 0.03));
      let top = 0, bottom = h - 1, left = 0, right = w - 1;
      while (top < h && rows[top] < minRow) top++;
      while (bottom >= 0 && rows[bottom] < minRow) bottom--;
      while (left < w && cols[left] < minCol) left++;
      while (right >= 0 && cols[right] < minCol) right--;
      if (bottom >= top && right >= left) {
        out = { sx: left, sy: top, sw: right - left + 1, sh: bottom - top + 1 };
      }
    }
  } catch {
    out = full;
  }
  if (DEBUG_HITBOX) {
    console.log("sprite crop", im.src, "natural", im.naturalWidth, "x", im.naturalHeight, "->", out);
  }
  cropCache.set(im, out);
  return out;
}

/* width that keeps the visible art's proportions at a given height */
const widthFor = (im: HTMLImageElement, h: number, fallback: number) => {
  if (!ready(im)) return fallback;
  const c = cropOf(im);
  return Math.max(1, Math.round((h * c.sw) / c.sh));
};

/* draw only the visible art, filling the box exactly */
const drawSprite = (
  ctx: CanvasRenderingContext2D, im: HTMLImageElement,
  x: number, y: number, w: number, h: number) => {
  const c = cropOf(im);
  ctx.drawImage(im, c.sx, c.sy, c.sw, c.sh, x, y, w, h);
};

type Box = { x: number; y: number; w: number; h: number };
const shrink = (x: number, y: number, w: number, h: number, i: Inset): Box => ({
  x: x + w * i.l,
  y: y + h * i.t,
  w: w * (1 - i.l - i.r),
  h: h * (1 - i.t - i.b) });
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

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
    decision: null as Decision | null,
    hover: null as Lane | null, /* lane under the mouse while a router waits */
    choose: ((_lane: Lane) => {}) as (lane: Lane) => void,
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

    /* local testing: don't save runs while running `npm run dev`.
       In production this saves normally. */
    if (process.env.NODE_ENV === "development") {
      console.log("dev run, score not saved:", score);
    } else {
      setResult(await submit(difficulty, score));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  /* jump doubles as "upper route" while a router is waiting for an answer */
  const jump = useCallback(() => {
    const g = game.current;
    if (!g.running) return;
    if (g.decision) { g.choose("up"); return; }
    if (g.y >= GROUND) {
      g.vy = JUMP_V;
      sound.click();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* duck doubles as "lower route" while a router is waiting for an answer */
  const setDuck = useCallback((on: boolean) => {
    const g = game.current;
    if (on && g.decision) { g.choose("down"); return; }
    g.ducking = on;
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
    g.obstacles = []; g.decision = null; g.running = true;

    const ip = dstStr(g.dst);
    setDst(ip);
    setHud({ dodged: 0, ttl: g.ttl, hop: 0 });
    setNote({
      tone: "info",
      text: `You are a packet bound for ${ip}. When a router appears the game pauses: press ↑ / Space for the upper route or ↓ for the lower. Pick the longest prefix that contains ${ip}.` });

    /* preload sprites; anything that fails to load falls back to boxes */
    const sprites = {
      ground: new Image(),
      air: new Image(),
      packet: new Image() };
    sprites.ground.src = SPRITES.ground;
    sprites.air.src = SPRITES.air;
    sprites.packet.src = SPRITES.packet;

    const sync = () => setHud({ dodged: g.dodged, ttl: g.ttl, hop: g.hops });
    const obstacleY = (o: Obstacle) =>
      o.kind === "air" ? AIR_BOTTOM - o.h : GROUND - o.h;

    const MONO = "ui-monospace, monospace";

    const drawGate = (gt: Gate) => {
      const waiting = g.decision?.gate === gt;
      const laneColor = (lane: Lane) =>
        !gt.resolved ? "#00c9ff" : lane === gt.correct ? "#00f5a0" : "#3a2330";

      ctx.fillStyle = "rgba(0,201,255,.05)";
      ctx.fillRect(gt.x, UP_Y - 16, gt.w, GROUND - UP_Y + 16);

      const box = (lane: Lane, y: number) => {
        const hot = waiting && g.hover === lane;
        if (hot) {
          ctx.fillStyle = "rgba(0,245,160,.16)";
          ctx.fillRect(gt.x, y, gt.w, LANE_H);
        }
        ctx.lineWidth = hot ? 2.5 : 1.5;
        ctx.strokeStyle = hot ? "#00f5a0" : laneColor(lane);
        ctx.strokeRect(gt.x, y, gt.w, LANE_H);
      };
      box("up", UP_Y);
      box("down", DN_Y);

      ctx.font = `bold 9px ${MONO}`;
      ctx.fillStyle = "#00c9ff";
      ctx.fillText(`ROUTER ${gt.router} · NEXT HOP?`, gt.x, UP_Y - 5);

      const lane = (r: Route, y: number, hint: string) => {
        ctx.font = `bold 11px ${MONO}`;
        ctx.fillStyle = "#cfe3ff";
        ctx.fillText(r.prefix, gt.x + 10, y + 26);
        ctx.font = `9px ${MONO}`;
        ctx.fillStyle = "#8fa7c4";
        ctx.fillText(`via ${r.hop} · ${hint}`, gt.x + 10, y + 44);
      };
      lane(gt.up, UP_Y, "↑ / space");
      lane(gt.down, DN_Y, "↓ down");
    };

    /* apply the chosen route (null = ran out of time) */
    const resolveGate = (gt: Gate, taken: Lane | null) => {
      gt.resolved = true;
      g.decision = null;
      g.hover = null;
      g.hops++;
      g.ttl -= 1; /* every router decrements TTL */

      /* Backstop: the world is about to resume at full speed, so make sure
         nothing is sitting on top of (or right in front of) the packet. */
      g.obstacles = g.obstacles.filter(
        (o) => !(o.x < PKT_X + SAFE_GAP && o.x + o.w > PKT_X - 20)
      );

      if (taken === gt.correct) {
        g.correct++;
        sound.tick();
        setNote({ tone: "ok", text: `${gt.router}: ✓ ${gt.why}` });
      } else {
        g.ttl -= 3; /* detour through extra routers */
        sound.bad();
        setNote({
          tone: "bad",
          text: taken === null
            ? `${gt.router}: ⏱ no route chosen in time, so the packet took a default detour. ${gt.why} Costs 3 extra TTL.`
            : `${gt.router}: ✗ wrong next hop: ${gt.why} Detour costs 3 extra TTL.` });
      }
      sync();

      if (g.ttl <= 0) {
        finish("expired", "TTL expired. A router discarded the packet and sent back ICMP Time Exceeded.");
      } else if (g.hops >= g.cfg.gates) {
        finish("delivered", `Delivered! Your packet reached ${ip} with TTL ${g.ttl} to spare.`);
      }
    };

    g.choose = (lane) => {
      const d = g.decision;
      if (!d || performance.now() < d.lockUntil) return;
      resolveGate(d.gate, lane);
    };

    let raf = 0;

    const loop = () => {
      if (!g.running) return;
      const now = performance.now();

      /* packet size this frame (width follows the art's proportions) */
      const pkH = g.ducking ? SIZE.pktDuckH : SIZE.pktH;
      const pkW = widthFor(sprites.packet, SIZE.pktH, FALLBACK_W.pkt);

      if (g.decision) {
        /* PAUSED: nothing moves, just the answer timer runs */
        if (now >= g.decision.deadline) {
          resolveGate(g.decision.gate, null);
          if (!g.running) return;
        }
      } else {
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

        /* Spawn hazards only when no router needs an answer soon (an
           unresolved router anywhere on screen) and leave a clean runway
           after each router once it has been answered. */
        const routerIncoming = g.gates.some((gt) => !gt.resolved);
        const routerJustPassed = g.gates.some((gt) => gt.resolved && gt.x > W - 400);
        if (g.frame % g.cfg.spawn === 0 && !routerIncoming && !routerJustPassed) {
          const h = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
          const isAir = h.kind === "air";
          const oh = isAir ? SIZE.airH : SIZE.groundH;
          const ow = widthFor(
            isAir ? sprites.air : sprites.ground, oh,
            isAir ? FALLBACK_W.air : FALLBACK_W.ground);
          g.obstacles.push({
            x: W + 20, w: ow, h: oh,
            kind: h.kind, label: h.label, color: h.color, why: h.why,
            passed: false });
        }

        /* Is any hazard close enough that the player couldn't react once
           the world resumes? If so, the router waits (keeps scrolling). */
        const hazardClose = g.obstacles.some(
          (o) => o.x + o.w > PKT_X - 20 && o.x < PKT_X + SAFE_GAP
        );

        /* move routers; pause when one is fully on screen, you're grounded,
           and the path ahead is clear */
        for (const gt of g.gates) {
          gt.x -= g.cfg.speed;
          if (
            !g.decision && !gt.resolved &&
            gt.x <= W - gt.w - 30 && g.y >= GROUND &&
            !hazardClose
          ) {
            g.decision = { gate: gt, deadline: now + g.cfg.decide, lockUntil: now + 500 };
            g.ducking = false;
            setNote({
              tone: "info",
              text: `${gt.router}: which next hop reaches ${ip}? ↑ / Space = upper route, ↓ = lower route.` });
          }
        }
        g.gates = g.gates.filter((gt) => gt.x > -gt.w - 20);

        /* hazards: move + collide (using the tighter hitboxes) */
        const pBox = shrink(PKT_X, g.y - pkH, pkW, pkH, HIT.pkt);
        for (const o of g.obstacles) {
          o.x -= g.cfg.speed;
          const oBox = shrink(o.x, obstacleY(o), o.w, o.h, HIT[o.kind]);
          if (overlaps(pBox, oBox)) {
            sound.bad();
            finish("dropped", `Dropped by ${o.label}: ${o.why}`);
            return;
          }
          if (!o.passed && o.x + o.w < PKT_X) {
            o.passed = true; g.dodged++; sound.tick(); sync();
          }
        }
        g.obstacles = g.obstacles.filter((o) => o.x > -120);
      }

      /* ── draw ── */
      const packetY = g.y - pkH;
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

      /* hazards (PNG sprite, or colored box if the image isn't available) */
      for (const o of g.obstacles) {
        const oy = obstacleY(o);
        const im = o.kind === "air" ? sprites.air : sprites.ground;
        if (ready(im)) {
          drawSprite(ctx, im, o.x, oy, o.w, o.h);
        } else {
          ctx.fillStyle = o.color;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(o.x, oy, o.w, o.h);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = "#8fa7c4";
        ctx.font = `9px ${MONO}`;
        ctx.fillText(o.label, o.x - 6, oy - 7);

        if (DEBUG_HITBOX) {
          const b = shrink(o.x, oy, o.w, o.h, HIT[o.kind]);
          ctx.strokeStyle = "#ff0044";
          ctx.lineWidth = 1;
          ctx.strokeRect(b.x, b.y, b.w, b.h);
        }
      }

      /* the packet (PNG sprite, or green box if the image isn't available) */
      if (ready(sprites.packet)) {
        drawSprite(ctx, sprites.packet, PKT_X, packetY, pkW, pkH);
      } else {
        ctx.fillStyle = "#00f5a0";
        ctx.shadowColor = "#00f5a0";
        ctx.shadowBlur = 12;
        ctx.fillRect(PKT_X, packetY, pkW, pkH);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#04090f";
        ctx.font = `bold 8px ${MONO}`;
        if (!g.ducking) ctx.fillText("PKT", PKT_X + 6, packetY + 18);
      }
      if (DEBUG_HITBOX) {
        const b = shrink(PKT_X, packetY, pkW, pkH, HIT.pkt);
        ctx.strokeStyle = "#ff0044";
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }

      /* answer countdown while paused */
      if (g.decision) {
        const left = Math.max(0, g.decision.deadline - now);
        const frac = left / g.cfg.decide;
        const barW = 300, bx = (W - barW) / 2;
        ctx.fillStyle = "#1e2c44";
        ctx.fillRect(bx, 12, barW, 6);
        ctx.fillStyle = frac > 0.3 ? "#00f5a0" : "#ff4d6d";
        ctx.fillRect(bx, 12, barW * frac, 6);
        ctx.fillStyle = "#cfe3ff";
        ctx.font = `bold 12px ${MONO}`;
        ctx.textAlign = "center";
        ctx.fillText("CLICK A ROUTE OR CHOOSE AN OPTION", W / 2, 36);
        ctx.fillStyle = frac > 0.3 ? "#8fa7c4" : "#ff4d6d";
        ctx.font = `10px ${MONO}`;
        ctx.fillText(`${(left / 1000).toFixed(1)}s left`, W / 2, 52);
        ctx.textAlign = "left";
      }

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

  /* which route box (if any) is under the mouse? Works even when the
     canvas is scaled down by CSS (max-w-full). */
  const laneAt = (e: React.MouseEvent<HTMLCanvasElement>): Lane | null => {
    const g = game.current;
    const canvas = canvasRef.current;
    if (!g.decision || !canvas) return null;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    const gt = g.decision.gate;
    if (x < gt.x || x > gt.x + gt.w) return null;
    if (y >= UP_Y && y <= UP_Y + LANE_H) return "up";
    if (y >= DN_Y && y <= DN_Y + LANE_H) return "down";
    return null;
  };

  const onCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    game.current.hover = laneAt(e);
  };
  const onCanvasLeave = () => { game.current.hover = null; };
  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const g = game.current;
    if (g.decision) {
      /* while a router waits, a click only counts if it lands on a box */
      const lane = laneAt(e);
      if (lane) g.choose(lane);
      return;
    }
    jump();
  };

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
          space / ↑ jump or upper route · ↓ duck or lower route
        </span>
      </Hud>

      <div className="flex justify-center bg-[#04090f] px-4 pt-8 pb-4">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={onCanvasClick}
          onMouseMove={onCanvasMove}
          onMouseLeave={onCanvasLeave}
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
        <button onMouseDown={jump} onTouchStart={jump} className="btn btn-primary">Jump / Upper</button>
        <button
          onTouchStart={() => setDuck(true)}
          onTouchEnd={() => setDuck(false)}
          className="btn btn-ghost"
        >
          Duck / Lower
        </button>
      </div>
    </>
  );
}