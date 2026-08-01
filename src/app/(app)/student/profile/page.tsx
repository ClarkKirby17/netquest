import Link from "next/link";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import {
  Mail, GraduationCap, Users, CalendarDays, Trophy, Flame, Zap,
  BookOpen, Award, Settings, ArrowRight, Gamepad2, Check } from "lucide-react";
import {
  db, users, studentProfiles, courses, sections, lessonProgress, lessons,
  moduleProgress, quizAttempts, gameScores, userBadges, badges } from "@/db";
import { requireRole } from "@/lib/guard";
import { stateFor } from "@/lib/gamification";
import { overallStats } from "@/lib/learning";
import { GAMES } from "@/lib/arcade";
import { Card, CardHead, PageHead, StatTile, Progress, Pill, Empty } from "@/components/ui";
import type { GameSlug } from "@/db/schema";

export default async function ProfilePage() {
  const me = await requireRole("student");

  /* Sequential rather than parallel — see the note in lib/reports.ts:
     pipelining parameterised queries over the pooled connection crossed
     parameter bindings. These are small and the page is not hot. */
  const profile = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      joined: users.createdAt,
      verified: users.emailVerifiedAt,
      points: studentProfiles.totalPoints,
      badgeCount: studentProfiles.badgeCount,
      course: courses.name,
      courseCode: courses.code,
      section: sections.name,
      instructorId: studentProfiles.instructorId })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .innerJoin(courses, eq(courses.id, studentProfiles.courseId))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .where(eq(studentProfiles.userId, me.userId))
    .limit(1);

  const p = profile[0];

  /* The instructor's name needs a second look at users — a student has
     no other way to find out who they were assigned to. */
  let instructorName: string | null = null;
  if (p?.instructorId) {
    const row = await db
      .select({ name: users.fullName })
      .from(users)
      .where(eq(users.id, p.instructorId))
      .limit(1);
    instructorName = row[0]?.name ?? null;
  }

  const game = await stateFor(me.userId);
  const stats = await overallStats(me.userId);

  /* Class rank: how many active classmates have more points. */
  let rank = 1;
  let classSize = 1;
  if (p?.instructorId) {
    const ahead = await db
      .select({ n: count() })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(
        and(
          eq(studentProfiles.instructorId, p.instructorId),
          eq(users.status, "active"),
          gt(studentProfiles.totalPoints, p.points)
        )
      );
    rank = Number(ahead[0]?.n ?? 0) + 1;

    const total = await db
      .select({ n: count() })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(
        and(eq(studentProfiles.instructorId, p.instructorId), eq(users.status, "active"))
      );
    classSize = Number(total[0]?.n ?? 1);
  }

  const quizPassed = await db
    .select({ n: sql<number>`count(distinct ${quizAttempts.quizId})` })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, me.userId), eq(quizAttempts.passed, true)));

  const arcadeRuns = await db
    .select({ n: count() })
    .from(gameScores)
    .where(eq(gameScores.userId, me.userId));

  const earnedBadges = await db
    .select({ name: badges.name, icon: badges.icon, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, me.userId))
    .orderBy(desc(userBadges.earnedAt))
    .limit(6);

  /* Recent activity, assembled from the three things a student does. */
  const recentLessons = await db
    .select({ title: lessons.title, at: lessonProgress.completedAt })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(and(eq(lessonProgress.userId, me.userId), eq(lessonProgress.completed, true)))
    .orderBy(desc(lessonProgress.completedAt))
    .limit(4);

  const recentQuizzes = await db
    .select({ percent: quizAttempts.percent, passed: quizAttempts.passed, at: quizAttempts.submittedAt })
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, me.userId))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(3);

  const recentRuns = await db
    .select({ game: gameScores.gameSlug, score: gameScores.score, at: gameScores.playedAt })
    .from(gameScores)
    .where(eq(gameScores.userId, me.userId))
    .orderBy(desc(gameScores.playedAt))
    .limit(3);

  type Item = { label: string; detail: string; at: Date; tone: "signal" | "warn" | "wire" };
  const activity: Item[] = [
    ...recentLessons
      .filter((l) => l.at)
      .map((l) => ({
        label: "Lesson complete",
        detail: l.title,
        at: l.at as Date,
        tone: "signal" as const })),
    ...recentQuizzes.map((q) => ({
      label: q.passed ? "Quiz passed" : "Quiz attempt",
      detail: `${q.percent}%`,
      at: q.at,
      tone: q.passed ? ("signal" as const) : ("warn" as const) })),
    ...recentRuns.map((r) => ({
      label: GAMES[r.game as GameSlug]?.name ?? "Arcade run",
      detail: `${r.score} points`,
      at: r.at,
      tone: "wire" as const })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  const initials = (p?.fullName ?? me.name)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  const dateFmt = (d: Date | string) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <PageHead
        eyebrow="profile"
        title="Your profile"
        sub="Who you are on NetQuest, and everything you've done here."
        action={
          <Link href="/account" className="btn btn-ghost">
            <Settings size={16} /> Account settings
          </Link>
        }
      />

      {/* identity */}
      <Card className="mb-4 p-6">
        <div className="flex flex-wrap items-center gap-6">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-signal)] bg-[var(--color-signal-soft)] font-[family-name:var(--font-display-src)] text-2xl font-bold text-[var(--color-signal)]">
            {initials}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="font-[family-name:var(--font-display-src)] text-2xl font-bold">
              {p?.fullName ?? me.name}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-[var(--color-muted)]">
              <span className="flex items-center gap-1.5">
                <Mail size={14} /> {p?.email}
              </span>
              {p?.joined && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} /> Joined {dateFmt(p.joined)}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone="signal">Level {game.level} · {game.title}
              </Pill>
              {p?.verified && <Pill tone="wire">verified</Pill>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-[var(--color-line)] pt-5 sm:grid-cols-3">
          <div>
            <div className="font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Course
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <GraduationCap size={15} className="text-[var(--color-signal)]" />
              {p?.course}
              {p?.courseCode && (
                <span className="text-[var(--color-muted)]">({p.courseCode})</span>
              )}
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Section
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Users size={15} className="text-[var(--color-signal)]" />
              {p?.section}
            </div>
          </div>
          <div>
            <div className="font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Instructor
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <Users size={15} className="text-[var(--color-signal)]" />
              {instructorName ?? <span className="text-[var(--color-muted)]">Not assigned</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* standing */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Trophy} label="Points" value={p?.points ?? 0} hint={`Rank #${rank} of ${classSize}`} />
        <StatTile icon={Zap} label="Total XP" value={game.xp} hint={`Level ${game.level}`} tone="wire" />
        <StatTile icon={Flame} label="Day streak" value={game.streakDays} hint={`Best ${game.bestStreak}`} tone="warn" />
        <StatTile icon={Award} label="Badges" value={p?.badgeCount ?? 0} tone="plain" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {/* progress */}
          <Card>
            <CardHead
              title="Course progress"
              sub="Across every published module."
              action={
                <Link href="/student/modules" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                  Continue <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="space-y-5 p-5">
              <div>
                <Progress
                  value={stats.percent}
                  label={`${stats.lessonsDone} of ${stats.lessonsTotal} lessons read`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-signal-soft)] text-[var(--color-signal)]">
                    <BookOpen size={16} />
                  </span>
                  <div>
                    <div className="font-[family-name:var(--font-display-src)] text-lg font-bold">
                      {stats.modulesDone}/{stats.modulesTotal}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">modules done</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-wire-soft)] text-[var(--color-wire)]">
                    <GraduationCap size={16} />
                  </span>
                  <div>
                    <div className="font-[family-name:var(--font-display-src)] text-lg font-bold">
                      {Number(quizPassed[0]?.n ?? 0)}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">quizzes passed</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[rgba(255,184,77,.1)] text-[var(--color-warn)]">
                    <Gamepad2 size={16} />
                  </span>
                  <div>
                    <div className="font-[family-name:var(--font-display-src)] text-lg font-bold">
                      {Number(arcadeRuns[0]?.n ?? 0)}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">arcade runs</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* activity */}
          <Card>
            <CardHead title="Recent activity" sub="Your last few moves." />
            {activity.length === 0 ? (
              <Empty
                icon={BookOpen}
                title="Nothing yet"
                body="Read a lesson or play an arcade round and it'll show up here."
                action={
                  <Link href="/student/modules" className="btn btn-primary px-3 py-1.5 text-[.82rem]">
                    Start learning
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--color-line)]">
                {activity.map((item, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3.5"><span className="text-sm font-medium">{item.label}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted)]">
                      {item.detail}
                    </span>
                    <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] text-[var(--color-muted)]">
                      {dateFmt(item.at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {/* level */}
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                level {game.level}
              </span>
              <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-signal)]">
                {game.xp} / {game.ceilingXp} XP
              </span>
            </div>
            <h3 className="mt-1 font-[family-name:var(--font-display-src)] text-xl font-bold">
              {game.title}
            </h3>
            <div className="mt-3">
              <Progress value={game.levelPercent} />
            </div>
            <p className="mt-2.5 text-xs text-[var(--color-muted)]">
              {Math.max(0, game.ceilingXp - game.xp)} XP to level {game.level + 1}
            </p>
          </Card>

          {/* badges */}
          <Card>
            <CardHead
              title="Latest badges"
              action={
                <Link href="/student/achievements" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                  All
                </Link>
              }
            />
            {earnedBadges.length === 0 ? (
              <Empty icon={Award} title="No badges yet" body="Finish your first lesson to earn one." />
            ) : (
              <div className="space-y-2.5 p-5">
                {earnedBadges.map((b) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-signal)] text-[var(--color-void)]">
                      <Check size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{b.name}</div>
                      <div className="font-[family-name:var(--font-mono-src)] text-[.62rem] uppercase tracking-[.12em] text-[var(--color-muted)]">
                        {dateFmt(b.earnedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
