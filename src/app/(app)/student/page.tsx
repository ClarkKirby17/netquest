import Link from "next/link";
import { eq } from "drizzle-orm";
import { Zap, Trophy, Flame, BookOpen, ArrowRight, Gamepad2 } from "lucide-react";
import { db, gamification, studentProfiles } from "@/db";
import { requireRole } from "@/lib/guard";
import { modulesForStudent, overallStats } from "@/lib/learning";
import { Card, CardHead, PageHead, StatTile, Progress, Pill, Empty } from "@/components/ui";

const LEVEL_TITLES = [
  "Cable Apprentice", "Packet Pusher", "Frame Forwarder", "Subnet Scout",
  "VLAN Voyager", "Route Master", "Gateway Guardian", "Protocol Pro",
  "Topology Titan", "Network Legend",
];
const xpForLevel = (n: number) => 50 * n * (n - 1);

export default async function StudentDashboard() {
  const me = await requireRole("student");

  const [stats, cards, game, profile] = await Promise.all([
    overallStats(me.userId),
    modulesForStudent(me.userId),
    db.query.gamification.findFirst({ where: eq(gamification.userId, me.userId) }),
    db.query.studentProfiles.findFirst({ where: eq(studentProfiles.userId, me.userId) }),
  ]);

  const level = game?.level ?? 1;
  const xp = game?.xp ?? 0;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const levelPct = Math.round(((xp - floor) / Math.max(1, ceiling - floor)) * 100);
  const title = LEVEL_TITLES[Math.min(level, 10) - 1];

  return (
    <>
      <PageHead
        eyebrow="your progress"
        title={`Welcome back, ${me.name.split(" ")[0]}`}
        sub="Pick up where you left off."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Zap} label="Level" value={level} hint={title} />
        <StatTile icon={Trophy} label="Points" value={profile?.totalPoints ?? 0} tone="wire" />
        <StatTile icon={Flame} label="Day streak" value={game?.streakDays ?? 0} tone="warn" />
        <StatTile icon={BookOpen} label="Overall" value={`${stats.percent}%`} hint={`${stats.lessonsDone}/${stats.lessonsTotal} lessons`} tone="plain" />
      </div>

      {stats.current && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-center gap-5 p-5">
            <div className="min-w-0 flex-1">
              <Pill tone="signal">in progress</Pill>
              <h3 className="mt-3 font-[family-name:var(--font-display-src)] text-xl font-bold">
                Module {stats.current.moduleNumber} · {stats.current.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {stats.current.lessonsDone} of {stats.current.lessonCount} lessons complete
              </p>
              <div className="mt-4 max-w-sm">
                <Progress value={stats.current.percent} />
              </div>
            </div>
            <Link href={`/student/modules/${stats.current.id}`} className="btn btn-primary">
              Continue <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHead
            title="Your modules"
            sub="They unlock in order."
            action={<Link href="/student/modules" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">View all</Link>}
          />
          {cards.length === 0 ? (
            <Empty icon={BookOpen} title="No modules released yet" body="Your instructor is still preparing the course." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {cards.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4"><div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        M{m.moduleNumber}
                      </span>
                      <span className={m.state === "locked" ? "text-[var(--color-muted)]" : "font-medium"}>
                        {m.title}
                      </span>
                    </div>
                    <div className="mt-2 max-w-xs"><Progress value={m.percent} /></div>
                  </div>
                  {m.state === "locked" ? (
                    <Pill>locked</Pill>
                  ) : m.state === "completed" ? (
                    <Pill tone="signal">complete</Pill>
                  ) : (
                    <Link href={`/student/modules/${m.id}`} className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                      Open
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                level {level}
              </span>
              <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-signal)]">
                {xp} / {ceiling} XP
              </span>
            </div>
            <h3 className="mt-1 font-[family-name:var(--font-display-src)] text-lg font-bold">{title}</h3>
            <div className="mt-3"><Progress value={levelPct} /></div>
            <p className="mt-3 text-xs text-[var(--color-muted)]">
              {Math.max(0, ceiling - xp)} XP to level {level + 1}
            </p>
          </Card>

          <Card>
            <CardHead title="Arcade" />
            <Empty
              icon={Gamepad2}
              title="Coming next phase"
              body="Three games: Door Challenge, Packet Run, and Net CLI."
            />
          </Card>
        </div>
      </div>
    </>
  );
}
