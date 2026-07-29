"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Square } from "lucide-react";
import type { Difficulty } from "@/db/schema";
import {
  TitleScreen, Countdown, Hud, HudItem, Summary,
  useArcadeSound, type SubmitResult,
} from "./shell";
import {
  isObjectiveMet, INTERFACES as IFACES,
  type DeviceState as State, type PlayableMission,
} from "@/lib/cli-types";
import { cn } from "@/lib/utils";

/* Net CLI — a simulated device console.
   Objectives are graded against the resulting CONFIG STATE, not the
   commands typed, so any valid path to the right configuration counts. */

type Phase = "title" | "count" | "play" | "over";
type Mode = "user" | "priv" | "conf" | "conf-if" | "conf-line";

const freshState = (): State => ({
  hostname: "Router",
  reachedPriv: false,
  reachedConf: false,
  saved: false,
  banner: null,
  vtyPassword: null,
  vtyLogin: false,
  interfaces: Object.fromEntries(
    IFACES.map((n) => [n, { ip: null, mask: null, up: false, desc: null }])
  ),
});

const ipOk = (s: string) =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split(".").every((o) => Number(o) <= 255);

export default function NetCli({
  best,
  scoringLeft,
  descriptions,
  fetchMission,
  submit,
}: {
  best: number;
  scoringLeft: number;
  descriptions: Record<Difficulty, string>;
  fetchMission: (d: Difficulty) => Promise<PlayableMission | null>;
  submit: (d: Difficulty, score: number) => Promise<SubmitResult>;
}) {
  const sound = useArcadeSound();
  const [phase, setPhase] = useState<Phase>("title");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [lines, setLines] = useState<{ text: string; tone?: "dim" | "err" }[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("user");
  const [curIf, setCurIf] = useState<string | null>(null);
  const [state, setState] = useState<State>(freshState);
  const [timeLeft, setTimeLeft] = useState(0);
  const [commands, setCommands] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const [mission, setMission] = useState<PlayableMission | null>(null);
  const [loading, setLoading] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneCount = mission
    ? mission.objectives.filter((o) => isObjectiveMet(o, state)).length
    : 0;

  const say = (text: string, tone?: "dim" | "err") =>
    setLines((l) => [...l, { text, tone }]);

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [lines]);

  /* boot sequence */
  useEffect(() => {
    if (phase !== "play") return;
    const boot = [
      "System Bootstrap, Version 15.0",
      "NetQuest IOS — Educational Build",
      "Initializing hardware... done",
      "Reading configuration... done",
      "",
      "Type ? for help. Objectives are listed on the right.",
      "",
    ];
    setLines([]);
    let i = 0;
    const id = setInterval(() => {
      if (i >= boot.length) { clearInterval(id); inputRef.current?.focus(); return; }
      say(boot[i++], "dim");
    }, 160);
    return () => clearInterval(id);
  }, [phase]);

  /* countdown */
  useEffect(() => {
    if (phase !== "play" || !mission) return;
    setTimeLeft(mission.timeLimitSeconds);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* auto-finish when every objective ticks */
  useEffect(() => {
    if (phase === "play" && mission && doneCount === mission.objectives.length) {
      sound.great();
      const t = setTimeout(finish, 900);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, phase]);

  function prompt() {
    const h = state.hostname;
    return {
      user: `${h}>`, priv: `${h}#`, conf: `${h}(config)#`,
      "conf-if": `${h}(config-if)#`, "conf-line": `${h}(config-line)#`,
    }[mode];
  }

  function abbrev(word: string, candidates: string[]) {
    const w = word.toLowerCase();
    const hits = candidates.filter((c) => c.startsWith(w));
    return hits.length === 1 ? hits[0] : candidates.includes(w) ? w : null;
  }

  function matchIf(token: string) {
    const t = token.toLowerCase().replace(/\s+/g, "");
    for (const name of IFACES) {
      const num = name.replace(/[a-zA-Z]+/, "");
      if (name.toLowerCase() === t) return name;
      if (["g" + num, "gi" + num, "gig" + num, "gigabitethernet" + num].includes(t)) return name;
    }
    return null;
  }

  function invalid(cmd: string, at = 0) {
    say(" ".repeat(prompt().length + 1 + at) + "^", "err");
    say("% Invalid input detected at '^' marker.", "err");
    sound.bad();
  }

  function run(raw: string) {
    const cmd = raw.trim();
    say(`${prompt()} ${raw}`);
    if (!cmd) return;
    setCommands((c) => c + 1);
    setHistory((h) => [...h, cmd]);
    setHistIdx(-1);

    if (cmd === "?") return help();

    const parts = cmd.split(/\s+/);
    const w0 = parts[0];

    /* ── user EXEC ── */
    if (mode === "user") {
      const c = abbrev(w0, ["enable", "exit", "show"]);
      if (c === "enable") { setMode("priv"); setState((s) => ({ ...s, reachedPriv: true })); sound.click(); return; }
      if (c === "show") return show(parts);
      if (c === "exit") return say("Connection closed.", "dim");
      return invalid(cmd);
    }

    /* ── privileged EXEC ── */
    if (mode === "priv") {
      const c = abbrev(w0, ["configure", "show", "ping", "write", "copy", "disable", "exit"]);
      if (c === "configure") {
        if (parts[1] && abbrev(parts[1], ["terminal"]) === "terminal") {
          setMode("conf");
          setState((s) => ({ ...s, reachedConf: true }));
          say("Enter configuration commands, one per line. End with CNTL/Z.", "dim");
          sound.click();
          return;
        }
        return invalid(cmd, w0.length + 1);
      }
      if (c === "show") return show(parts);
      if (c === "ping") return ping(parts[1]);
      if (c === "write" || (c === "copy" && parts[1] && parts[2])) {
        setState((s) => ({ ...s, saved: true }));
        say("Building configuration...");
        say("[OK]");
        sound.good();
        return;
      }
      if (c === "disable" || c === "exit") { setMode("user"); return; }
      return invalid(cmd);
    }

    /* ── global config ── */
    if (mode === "conf") {
      const c = abbrev(w0, ["hostname", "interface", "line", "banner", "exit", "end"]);
      if (c === "hostname") {
        if (!parts[1]) return invalid(cmd);
        setState((s) => ({ ...s, hostname: parts[1] }));
        sound.click();
        return;
      }
      if (c === "interface") {
        const name = matchIf(parts.slice(1).join(""));
        if (!name) return invalid(cmd, w0.length + 1);
        setCurIf(name); setMode("conf-if");
        return;
      }
      if (c === "line") {
        const sub = parts[1] ? abbrev(parts[1], ["vty", "console"]) : null;
        if (!sub) return invalid(cmd, w0.length + 1);
        setMode("conf-line");
        return;
      }
      if (c === "banner") {
        const delim = parts[2] ?? "#";
        const text = cmd.split(delim)[1];
        setState((s) => ({ ...s, banner: text?.trim() || "WELCOME" }));
        sound.click();
        return;
      }
      if (c === "exit" || c === "end") { setMode("priv"); return; }
      return invalid(cmd);
    }

    /* ── interface config ── */
    if (mode === "conf-if" && curIf) {
      const c = abbrev(w0, ["ip", "no", "shutdown", "description", "exit", "end"]);
      if (c === "ip") {
        if (parts[1] && abbrev(parts[1], ["address"]) === "address" && ipOk(parts[2] ?? "") && ipOk(parts[3] ?? "")) {
          setState((s) => ({
            ...s,
            interfaces: { ...s.interfaces, [curIf]: { ...s.interfaces[curIf], ip: parts[2], mask: parts[3] } },
          }));
          sound.click();
          return;
        }
        return invalid(cmd, w0.length + 1);
      }
      if (c === "no") {
        if (parts[1] && abbrev(parts[1], ["shutdown"]) === "shutdown") {
          setState((s) => ({
            ...s,
            interfaces: { ...s.interfaces, [curIf]: { ...s.interfaces[curIf], up: true } },
          }));
          say(`%LINK-5-CHANGED: Interface ${curIf}, changed state to up`, "dim");
          say(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${curIf}, changed state to up`, "dim");
          sound.good();
          return;
        }
        return invalid(cmd, w0.length + 1);
      }
      if (c === "shutdown") {
        setState((s) => ({
          ...s,
          interfaces: { ...s.interfaces, [curIf]: { ...s.interfaces[curIf], up: false } },
        }));
        say(`%LINK-5-CHANGED: Interface ${curIf}, changed state to administratively down`, "dim");
        return;
      }
      if (c === "description") {
        const text = parts.slice(1).join(" ");
        setState((s) => ({
          ...s,
          interfaces: { ...s.interfaces, [curIf]: { ...s.interfaces[curIf], desc: text } },
        }));
        sound.click();
        return;
      }
      if (c === "exit") { setMode("conf"); setCurIf(null); return; }
      if (c === "end") { setMode("priv"); setCurIf(null); return; }
      return invalid(cmd);
    }

    /* ── line config ── */
    if (mode === "conf-line") {
      const c = abbrev(w0, ["password", "login", "exit", "end"]);
      if (c === "password") {
        if (!parts[1]) return invalid(cmd);
        setState((s) => ({ ...s, vtyPassword: parts[1] }));
        sound.click();
        return;
      }
      if (c === "login") { setState((s) => ({ ...s, vtyLogin: true })); sound.click(); return; }
      if (c === "exit") { setMode("conf"); return; }
      if (c === "end") { setMode("priv"); return; }
      return invalid(cmd);
    }
  }

  function help() {
    const H: Record<Mode, string[]> = {
      user: ["enable        Turn on privileged commands", "show          Show running system information", "exit          Exit the EXEC"],
      priv: ["configure     Enter configuration mode", "show          Show running system information", "ping          Send echo messages", "write         Write running config to memory", "disable       Turn off privileged commands"],
      conf: ["hostname      Set the system's name", "interface     Select an interface", "line          Configure a terminal line", "banner        Define a login banner", "end           Exit configure mode"],
      "conf-if": ["ip address    Set the interface address", "no shutdown   Enable the interface", "shutdown      Disable the interface", "description   Describe the interface", "exit          Leave interface config"],
      "conf-line": ["password      Set a password", "login         Require password checking", "exit          Leave line config"],
    };
    H[mode].forEach((l) => say("  " + l, "dim"));
  }

  function show(parts: string[]) {
    const sub = parts[1]?.toLowerCase() ?? "";
    if (sub.startsWith("run")) {
      say("Building configuration...", "dim");
      say("!");
      say(`hostname ${state.hostname}`);
      say("!");
      IFACES.forEach((n) => {
        const i = state.interfaces[n];
        say(`interface ${n}`);
        if (i.desc) say(` description ${i.desc}`);
        say(i.ip ? ` ip address ${i.ip} ${i.mask}` : " no ip address");
        say(i.up ? " no shutdown" : " shutdown");
        say("!");
      });
      if (state.banner) say(`banner motd ^C ${state.banner} ^C`);
      if (state.vtyPassword) {
        say("line vty 0 4");
        say(` password ${state.vtyPassword}`);
        if (state.vtyLogin) say(" login");
        say("!");
      }
      say("end");
      return;
    }
    if (sub === "ip") {
      say("Interface                  IP-Address      OK? Status");
      IFACES.forEach((n) => {
        const i = state.interfaces[n];
        say(
          n.padEnd(27) +
            (i.ip ?? "unassigned").padEnd(16) +
            "YES " +
            (i.up ? "up" : "administratively down")
        );
      });
      return;
    }
    if (sub.startsWith("ver")) {
      say("NetQuest IOS — Educational Build, Version 15.0");
      return;
    }
    invalid(parts.join(" "), parts[0].length + 1);
  }

  function ping(target?: string) {
    if (!target || !ipOk(target)) return invalid(`ping ${target ?? ""}`, 5);
    const reachable = IFACES.some(
      (n) => state.interfaces[n].ip === target && state.interfaces[n].up
    );
    say("Type escape sequence to abort.", "dim");
    say(`Sending 5, 100-byte ICMP Echos to ${target}:`, "dim");
    say(reachable ? "!!!!!" : ".....");
    say(`Success rate is ${reachable ? 100 : 0} percent (${reachable ? 5 : 0}/5)`);
    if (reachable) sound.good();
  }

  function scoreNow() {
    if (!mission || mission.objectives.length === 0) return 0;
    const done = mission.objectives.filter((o) => isObjectiveMet(o, state)).length;
    const base = Math.round((done / mission.objectives.length) * 880);
    const bonus =
      done === mission.objectives.length
        ? Math.round((timeLeft / Math.max(1, mission.timeLimitSeconds)) * 120)
        : 0;
    return Math.min(1000, base + bonus);
  }

  async function finish() {
    const score = scoreNow();
    setPhase("over");
    setResult(await submit(difficulty, score));
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { run(input); setInput(""); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(history.length - 1, histIdx + 1);
      if (next >= 0 && history.length) { setHistIdx(next); setInput(history[history.length - 1 - next]); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = histIdx - 1;
      setHistIdx(next);
      setInput(next < 0 ? "" : history[history.length - 1 - next]);
      return;
    }
    sound.type();
  }

  /* ─────────────── render ─────────────── */

  if (phase === "title") {
    return (
      <>
        <TitleScreen
          name="Net CLI"
          tagline="a real terminal, a real mission"
          blurb="Configure the device from the command line. Objectives grade the resulting config, so any valid path counts."
          best={best}
          scoringLeft={scoringLeft}
          descriptions={descriptions}
          onStart={async (d) => {
            setLoading(true);
            const m = await fetchMission(d);
            setLoading(false);
            if (!m || m.objectives.length === 0) return;
            setMission(m);
            setDifficulty(d); setState(freshState()); setMode("user");
            setCurIf(null); setCommands(0); setHistory([]); setResult(null);
            setPhase("count");
          }}
        />
        {loading && (
          <p className="pb-8 text-center font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
            loading mission…
          </p>
        )}
      </>
    );
  }

  if (phase === "count") return <Countdown onDone={() => setPhase("play")} />;

  if (phase === "over") {
    return (
      <Summary
        score={scoreNow()}
        difficulty={difficulty}
        stats={[
          { label: "objectives", value: `${doneCount}/${mission?.objectives.length ?? 0}` },
          { label: "commands", value: commands },
        ]}
        result={result}
        onReplay={() => setPhase("title")}
      />
    );
  }

  if (!mission) return null;

  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <>
      <Hud>
        <HudItem label="mission" value={difficulty} />
        <HudItem label="objectives" value={`${doneCount}/${mission.objectives.length}`} tone="signal" />
        <span className="ml-auto">
          <HudItem label="time" value={`${mm}:${ss}`} tone={timeLeft <= 30 ? "alert" : "text"} />
        </span>
      </Hud>

      <div className="grid lg:grid-cols-[1.6fr_1fr]">
        <div
          ref={screenRef}
          onClick={() => inputRef.current?.focus()}
          className="cli-screen cursor-text px-4 py-3"
          style={{ minHeight: 440, maxHeight: 520 }}
        >
          {lines.map((l, i) => (
            <div
              key={i}
              className="cli-line"
              style={{
                color:
                  l.tone === "err" ? "var(--color-alert)" :
                  l.tone === "dim" ? "rgba(0,245,160,.55)" : undefined,
              }}
            >
              {l.text}
            </div>
          ))}

          <div className="cli-line flex">
            <span>{prompt()}&nbsp;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoComplete="off"
              className="cli-input"
              aria-label="Terminal input"
            />
          </div>
        </div>

        <aside className="border-t border-[var(--color-line)] bg-[var(--color-deep)] p-5 lg:border-l lg:border-t-0">
          <h3 className="font-[family-name:var(--font-display-src)] text-base font-bold">
            {mission.title}
          </h3>
          {mission.briefing && (
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted)]">
              {mission.briefing}
            </p>
          )}
          <div className="mt-4 space-y-2.5">
            {mission.objectives.map((o) => {
              const done = isObjectiveMet(o, state);
              return (
                <div
                  key={o.id}
                  className={cn(
                    "flex items-start gap-2.5 text-sm transition-colors",
                    done ? "text-[var(--color-signal)] line-through" : "text-[var(--color-muted)]"
                  )}
                >
                  {done ? <Check size={15} className="mt-0.5 shrink-0" /> : <Square size={15} className="mt-0.5 shrink-0" />}
                  <span>{o.label}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-xs leading-relaxed text-[var(--color-muted)]">
            Commands abbreviate — <code className="text-[var(--color-signal)]">conf t</code> works.
            Type <code className="text-[var(--color-signal)]">?</code> for the command list,
            or <code className="text-[var(--color-signal)]">show run</code> to review your config.
          </p>

          <button onClick={finish} className="btn btn-ghost mt-5 w-full">
            End session &amp; score
          </button>
        </aside>
      </div>
    </>
  );
}
