import { eq } from "drizzle-orm";
import * as Icons from "lucide-react";
import { Flame, Star } from "lucide-react";
import { db, studentProfiles } from "@/db";
import { requireRole } from "@/lib/guard";
import { stateFor, badgeCatalog, LEVEL_TITLES, xpForLevel } from "@/lib/gamification";
import { Card, CardHead, PageHead, Progress, StatTile } from "@/components/ui";
import { cn } from "@/lib/utils";

/* Badge icons are stored as lucide kebab names; resolve them safely
   and fall back to Award rather than crashing on a typo. */
function BadgeIcon({ name, size = 22 }: { name: string; size?: number }) {
  const pascal = name.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  const Cmp = (Icons as unknown as Record<string, Icons.LucideIcon>)[pascal] ?? Icons.Award;
  return <Cmp size={size} />;
}

export default async function AchievementsPage() {
  const me = await requireRole("student");
  const [game, catalog, profile] = await Promise.all([
    stateFor(me.userId),
    badgeCatalog(me.userId),
    db.query.studentProfiles.findFirst({ where: eq(studentProfiles.userId, me.userId) }),
  ]);

  const earned = catalog.filter((b) => b.earnedAt);

  return (
    <>
      <PageHead eyebrow="achievements" title="Your trophy case" sub="Levels, streaks, and every badge worth chasing." />

      <Card className="mb-5 p-6">
        <div className="flex flex-wrap items-center gap-8">
          <div className="min-w-[240px] flex-1">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                level {game.level}
              </span>
              <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-signal)]">
                {game.xp} / {game.ceilingXp} XP
              </span>
            </div>
            <h2 className="mt-1 font-[family-name:var(--font-display-src)] text-2xl font-bold">
              {game.title}
            </h2>
            <div className="mt-3"><Progress value={game.levelPercent} /></div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              {Math.max(0, game.ceilingXp - game.xp)} XP to level {game.level + 1}
              {game.level < LEVEL_TITLES.length &&
                ` · ${LEVEL_TITLES[game.level]}`}
            </p>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 font-[family-name:var(--font-display-src)] text-3xl font-bold text-[var(--color-warn)]">
                <Flame size={22} /> {game.streakDays}
              </div>
              <div className="mt-1 font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                day streak
              </div>
            </div>
            <div className="text-center">
              <div className="font-[family-name:var(--font-display-src)] text-3xl font-bold">
                {game.bestStreak}
              </div>
              <div className="mt-1 font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                best streak
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatTile icon={Star} label="Badges earned" value={`${earned.length}/${catalog.length}`} />
        <StatTile icon={Icons.Trophy} label="Total points" value={profile?.totalPoints ?? 0} tone="wire" />
        <StatTile icon={Icons.Zap} label="Total XP" value={game.xp} tone="warn" />
      </div>

      <Card>
        <CardHead title="Badges" sub={`${earned.length} of ${catalog.length} unlocked`} />
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((b) => {
            const got = Boolean(b.earnedAt);
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-start gap-3 rounded-[12px] border p-4 transition-colors",
                  got
                    ? "border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)]"
                    : "border-[var(--color-line)] opacity-45"
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
                    got
                      ? "bg-[var(--color-signal)] text-[var(--color-void)]"
                      : "bg-[rgba(255,255,255,.05)] text-[var(--color-muted)]"
                  )}
                >
                  <BadgeIcon name={b.icon} />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{b.name}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
                    {b.description}
                  </p>
                  {got && (
                    <p className="mt-1.5 font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.12em] text-[var(--color-signal)]">
                      earned {new Date(b.earnedAt!).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
