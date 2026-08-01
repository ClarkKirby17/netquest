import Link from "next/link";
import { DoorOpen, Gauge, Terminal, Trophy, Zap, Flame } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { GAMES, hubStats, SCORING_RUNS_PER_DAY } from "@/lib/arcade";
import { stateFor } from "@/lib/gamification";
import { Card, PageHead, Progress, Pill } from "@/components/ui";
import type { GameSlug } from "@/db/schema";

const ICONS = { door: DoorOpen, "packet-run": Gauge, "net-cli": Terminal };

export default async function ArcadeHub() {
  const me = await requireRole("student");
  const [stats, game] = await Promise.all([hubStats(me.userId), stateFor(me.userId)]);

  return (
    <>
      <PageHead
        eyebrow="the arcade"
        title="Three games, real networking"
        sub={`Every run earns XP. The first ${SCORING_RUNS_PER_DAY} runs per game each day also earn leaderboard points.`}
      />

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                level {game.level} · {game.title}
              </span>
              <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-signal)]">
                {game.xp} / {game.ceilingXp} XP
              </span>
            </div>
            <div className="mt-2.5"><Progress value={game.levelPercent} /></div>
          </div>
          {game.streakDays > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-1.5 font-[family-name:var(--font-display-src)] text-2xl font-bold text-[var(--color-warn)]">
                <Flame size={20} /> {game.streakDays}
              </div>
              <div className="font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                day streak
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(GAMES) as GameSlug[]).map((slug) => {
          const g = GAMES[slug];
          const s = stats[slug];
          const Icon = ICONS[slug];
          return (
            <Link key={slug} href={`/student/arcade/${slug}`} className="block">
              <Card hover className="flex h-full flex-col p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-signal-soft)] text-[var(--color-signal)]">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-display-src)] text-base font-bold">
                      {g.name}
                    </h3>
                    <span className="font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.12em] text-[var(--color-muted)]">
                      {g.tagline}
                    </span>
                  </div>
                </div>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">
                  {g.blurb}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4 font-[family-name:var(--font-mono-src)] text-[.7rem] text-[var(--color-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-[var(--color-warn)]" /> {s.best}
                  </span>
                  <span>{s.runs} run{s.runs === 1 ? "" : "s"}</span>
                  <span className={"ml-auto " + (s.scoringLeft > 0 ? "text-[var(--color-signal)]" : "text-[var(--color-alert)]")}>
                    {s.scoringLeft} scoring left
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
