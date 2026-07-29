"use client";

import { useEffect, useState } from "react";

/* The hero is a live traceroute. Nodes light up in step with the
   terminal output, so the most characteristic artifact in networking
   doubles as the explanation of what the product teaches. */

type Hop = { n: number; name: string; ip: string; ms: string; x: number; y: number };

const HOPS: Hop[] = [
  { n: 1, name: "your-pc", ip: "192.168.1.14", ms: "0.31", x: 60, y: 150 },
  { n: 2, name: "gateway", ip: "192.168.1.1", ms: "0.42", x: 175, y: 70 },
  { n: 3, name: "core-sw", ip: "10.0.1.1", ms: "1.18", x: 295, y: 175 },
  { n: 4, name: "edge-rtr", ip: "10.0.2.1", ms: "3.94", x: 410, y: 80 },
  { n: 5, name: "netquest", ip: "10.0.3.7", ms: "4.21", x: 520, y: 155 },
];

export default function TraceHero() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(HOPS.length);
      return;
    }
    let i = -1;
    const tick = () => {
      i += 1;
      setStep(i);
      if (i > HOPS.length + 2) i = -1; // loop with a beat of rest
    };
    const id = setInterval(tick, 780);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="nq-card overflow-hidden">
      {/* topology */}
      <div className="border-b border-[var(--color-line)] bg-[#04090f] p-3">
        <svg viewBox="0 0 580 230" className="w-full" role="img" aria-label="Network path from your PC to NetQuest">
          {HOPS.slice(0, -1).map((h, i) => {
            const next = HOPS[i + 1];
            const lit = step > i + 1;
            return (
              <line
                key={`l${i}`}
                x1={h.x} y1={h.y} x2={next.x} y2={next.y}
                stroke={lit ? "#00c9ff" : "#1e2c44"}
                strokeWidth={lit ? 2.5 : 2}
                style={{ transition: "stroke .3s ease" }}
              />
            );
          })}

          {HOPS.map((h, i) => {
            const reached = step >= i;
            return (
              <g key={h.n}>
                <circle
                  cx={h.x} cy={h.y} r={reached ? 15 : 13}
                  fill="#0f1826"
                  stroke={reached ? "#00f5a0" : "#1e2c44"}
                  strokeWidth="2.5"
                  style={{
                    transition: "all .3s ease",
                    filter: reached ? "drop-shadow(0 0 7px rgba(0,245,160,.55))" : "none",
                  }}
                />
                <text
                  x={h.x} y={h.y + 34}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fill={reached ? "#8fa7c4" : "#3d4f6b"}
                  style={{ transition: "fill .3s ease" }}
                >
                  {h.name}
                </text>
              </g>
            );
          })}

          {/* the packet itself */}
          {step >= 0 && step < HOPS.length && (
            <circle r="5" fill="#00f5a0" style={{ filter: "drop-shadow(0 0 8px #00f5a0)" }}>
              <animate
                attributeName="cx"
                from={HOPS[Math.max(0, step - 1)].x}
                to={HOPS[step].x}
                dur="0.7s"
                fill="freeze"
              />
              <animate
                attributeName="cy"
                from={HOPS[Math.max(0, step - 1)].y}
                to={HOPS[step].y}
                dur="0.7s"
                fill="freeze"
              />
            </circle>
          )}
        </svg>
      </div>

      {/* terminal */}
      <div className="nq-term rounded-none border-0" style={{ minHeight: 178 }}>
        <div className="dim">$ traceroute netquest.academy</div>
        {HOPS.map((h, i) =>
          step >= i ? (
            <div key={h.n} className="out">
              <span className="text-[var(--color-muted)]">{String(h.n).padStart(2, " ")} </span>
              <span className="text-[var(--color-signal)]">{h.name.padEnd(10, " ")}</span>
              <span className="text-[var(--color-wire)]">{h.ip.padEnd(15, " ")}</span>
              <span className="text-[var(--color-muted)]">{h.ms} ms</span>
            </div>
          ) : null
        )}
        {step >= HOPS.length ? (
          <div className="dim">trace complete — {HOPS.length} hops · you made it</div>
        ) : (
          <div className="caret" />
        )}
      </div>
    </div>
  );
}
