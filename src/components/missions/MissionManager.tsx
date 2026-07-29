import { Terminal, Check } from "lucide-react";
import { Card, CardHead, Pill, Empty } from "@/components/ui";
import {
  createMission, deleteMission, toggleMission, addObjective, deleteObjective,
} from "@/lib/mission-actions";
import { OBJECTIVE_KINDS, INTERFACES, describeObjective } from "@/lib/cli-types";
import type { CliObjectiveKind, Difficulty } from "@/db/schema";
import { cn } from "@/lib/utils";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.9rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export type MissionRow = {
  id: number;
  title: string;
  briefing: string;
  difficulty: Difficulty;
  timeLimitSeconds: number;
  active: boolean;
  objectives: {
    id: number;
    kind: CliObjectiveKind;
    iface: string | null;
    value: string | null;
    value2: string | null;
  }[];
};

export default function MissionManager({
  scope,
  missions,
  globalCount = 0,
}: {
  scope: "mine" | "global";
  missions: MissionRow[];
  globalCount?: number;
}) {
  const tone = { easy: "signal", medium: "warn", hard: "alert" } as const;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="mb-4 text-[.95rem] font-semibold">New mission</h2>
        <form action={createMission} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="scope" value={scope} />
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelCx}>Title</label>
            <input id="title" name="title" required minLength={2}
              placeholder="Bring up the WAN link" className={inputCx} />
          </div>
          <div>
            <label htmlFor="difficulty" className={labelCx}>Difficulty</label>
            <select id="difficulty" name="difficulty" defaultValue="easy" className={inputCx + " cursor-pointer"}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label htmlFor="timeLimitSeconds" className={labelCx}>Time limit (seconds)</label>
            <input id="timeLimitSeconds" name="timeLimitSeconds" type="number" min={60} max={1800}
              defaultValue={300} className={inputCx} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="briefing" className={labelCx}>Briefing</label>
            <textarea id="briefing" name="briefing" rows={2}
              placeholder="One line of context shown beside the objectives." className={inputCx} />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary">Create mission</button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHead
          title={scope === "global" ? "Global missions" : "My missions"}
          sub={
            scope === "global"
              ? "Every student can be given these."
              : `Used for your students first; ${globalCount} global mission${globalCount === 1 ? "" : "s"} act as the fallback.`
          }
        />
        {missions.length === 0 ? (
          <Empty
            icon={Terminal}
            title="No missions yet"
            body={
              scope === "global"
                ? "Create the missions every section can play."
                : "Create your own, or leave this empty and your students play the global ones."
            }
          />
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {missions.map((m) => (
              <div key={m.id} className={cn("px-5 py-5", !m.active && "opacity-50")}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Pill tone={tone[m.difficulty]}>{m.difficulty}</Pill>
                      <Pill>{Math.round(m.timeLimitSeconds / 60)} min</Pill>
                      {!m.active && <Pill>hidden</Pill>}
                    </div>
                    <h3 className="font-[family-name:var(--font-display-src)] text-base font-bold">
                      {m.title}
                    </h3>
                    {m.briefing && (
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{m.briefing}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <form action={toggleMission}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="scope" value={scope} />
                      <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                      <button className="btn btn-ghost px-2.5 py-1 text-[.78rem]">
                        {m.active ? "Hide" : "Show"}
                      </button>
                    </form>
                    <form action={deleteMission}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="scope" value={scope} />
                      <button className="btn px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                {/* objectives */}
                <div className="mt-4 space-y-1.5">
                  {m.objectives.length === 0 ? (
                    <p className="text-xs text-[var(--color-warn)]">
                      No objectives yet — a mission needs at least one to be playable.
                    </p>
                  ) : (
                    m.objectives.map((o, i) => (
                      <div key={o.id} className="flex items-center gap-2.5 text-sm">
                        <Check size={14} className="shrink-0 text-[var(--color-signal)]" />
                        <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-[var(--color-muted)]">{describeObjective(o)}</span>
                        <form action={deleteObjective}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="scope" value={scope} />
                          <button className="text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-alert)]">
                            remove
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>

                {/* add objective */}
                <form action={addObjective} className="mt-4 flex flex-wrap items-end gap-2 rounded-[10px] border border-[var(--color-line)] p-3">
                  <input type="hidden" name="missionId" value={m.id} />
                  <input type="hidden" name="scope" value={scope} />
                  <div className="min-w-[190px] flex-1">
                    <label className={labelCx}>Objective</label>
                    <select name="kind" className={inputCx + " cursor-pointer"} defaultValue="hostname">
                      {OBJECTIVE_KINDS.map((k) => (
                        <option key={k.kind} value={k.kind}>{k.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[150px]">
                    <label className={labelCx}>Interface</label>
                    <select name="iface" className={inputCx + " cursor-pointer"} defaultValue="">
                      <option value="">n/a</option>
                      {INTERFACES.map((i) => (
                        <option key={i} value={i}>{i.replace("GigabitEthernet", "Gi")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[140px]">
                    <label className={labelCx}>Value</label>
                    <input name="value" placeholder="R1 / 10.0.0.1" className={inputCx} />
                  </div>
                  <div className="w-[140px]">
                    <label className={labelCx}>Value 2</label>
                    <input name="value2" placeholder="mask" className={inputCx} />
                  </div>
                  <button className="btn btn-ghost">Add</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
