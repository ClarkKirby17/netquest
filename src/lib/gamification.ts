import { and, count, eq, sql } from "drizzle-orm";
import {
  db, gamification, badges, userBadges, studentProfiles, notifications,
  auditLogs, lessonProgress, moduleProgress, modules, gameScores,
} from "@/db";
import { getSettingInt } from "./settings";

/* ══════════════════════════════════════════════════════════════
   GAMIFICATION

   XP, levels, daily streaks, and badges. Every entry point is
   fail-safe: if something here throws, the learning flow that
   called it must still succeed.
   ══════════════════════════════════════════════════════════════ */

export const LEVEL_TITLES = [
  "Cable Apprentice", "Packet Pusher", "Frame Forwarder", "Subnet Scout",
  "VLAN Voyager", "Route Master", "Gateway Guardian", "Protocol Pro",
  "Topology Titan", "Network Legend",
] as const;

/** L2 = 100, L3 = 300, L4 = 600, L5 = 1000 … */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelForXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function titleForLevel(level: number) {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
}

export type GameState = {
  xp: number;
  level: number;
  title: string;
  streakDays: number;
  bestStreak: number;
  floorXp: number;
  ceilingXp: number;
  levelPercent: number;
};

export async function stateFor(userId: number): Promise<GameState> {
  let row = await db.query.gamification.findFirst({
    where: eq(gamification.userId, userId),
  });

  if (!row) {
    await db.insert(gamification).values({ userId }).onConflictDoNothing();
    row = await db.query.gamification.findFirst({
      where: eq(gamification.userId, userId),
    });
  }

  const xp = row?.xp ?? 0;
  const level = row?.level ?? 1;
  const floorXp = xpForLevel(level);
  const ceilingXp = xpForLevel(level + 1);

  return {
    xp,
    level,
    title: titleForLevel(level),
    streakDays: row?.streakDays ?? 0,
    bestStreak: row?.bestStreak ?? 0,
    floorXp,
    ceilingXp,
    levelPercent: Math.round(((xp - floorXp) / Math.max(1, ceilingXp - floorXp)) * 100),
  };
}

/** Add XP; returns whether a level boundary was crossed. */
export async function addXp(userId: number, amount: number) {
  const before = await stateFor(userId);
  const xp = Math.max(0, before.xp + amount);
  const level = levelForXp(xp);
  const leveledUp = level > before.level;

  await db
    .update(gamification)
    .set({ xp, level })
    .where(eq(gamification.userId, userId));

  if (leveledUp) {
    await db.insert(notifications).values({
      userId,
      title: `Level ${level} — ${titleForLevel(level)} ⭐`,
      body: "Your XP just pushed you to the next level.",
      link: "/student/achievements",
    });
    if (level >= 5) await award(userId, ["level-5"]);
  }

  return { xp, level, leveledUp, gained: amount };
}

/** today keeps the streak · yesterday extends it · older resets to 1 */
export async function touchStreak(userId: number) {
  const row = await db.query.gamification.findFirst({
    where: eq(gamification.userId, userId),
  });
  if (!row) {
    await db.insert(gamification).values({ userId }).onConflictDoNothing();
  }

  const today = new Date().toISOString().slice(0, 10);
  const last = row?.lastActivityDate ?? null;
  if (last === today) return;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const streak = last === yesterday ? (row?.streakDays ?? 0) + 1 : 1;

  await db
    .update(gamification)
    .set({
      streakDays: streak,
      bestStreak: sql`GREATEST(${gamification.bestStreak}, ${streak})`,
      lastActivityDate: today,
    })
    .where(eq(gamification.userId, userId));

  const slugs: string[] = [];
  if (streak === 3) slugs.push("streak-3");
  if (streak === 7) slugs.push("streak-7");
  if (slugs.length) await award(userId, slugs);
}

/**
 * Grant badges the student doesn't already hold.
 * badgeCount on the profile is kept in sync here and nowhere else,
 * so it can't drift from the actual rows.
 */
export async function award(userId: number, slugs: string[]) {
  if (slugs.length === 0) return [];
  const earned: { name: string; icon: string }[] = [];

  for (const slug of Array.from(new Set(slugs))) {
    const badge = await db.query.badges.findFirst({ where: eq(badges.slug, slug) });
    if (!badge) continue;

    const already = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)),
    });
    if (already) continue;

    await db.insert(userBadges).values({ userId, badgeId: badge.id }).onConflictDoNothing();
    await db
      .update(studentProfiles)
      .set({ badgeCount: sql`${studentProfiles.badgeCount} + 1` })
      .where(eq(studentProfiles.userId, userId));
    await db.insert(notifications).values({
      userId,
      title: `Badge earned: ${badge.name} 🏅`,
      body: badge.description,
      link: "/student/achievements",
    });

    earned.push({ name: badge.name, icon: badge.icon });
  }

  return earned;
}

/* ─────────────────────────── event hooks ───────────────────────────
   Each wrapped so a gamification failure can never break the lesson,
   quiz, or game flow that triggered it.                              */

export async function onLessonCompleted(userId: number) {
  try {
    await touchStreak(userId);
    await addXp(userId, 15);

    const [{ n }] = await db
      .select({ n: count() })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true)));
    if (Number(n) === 1) await award(userId, ["first-lesson"]);
  } catch (e) {
    console.error("gamification.onLessonCompleted", e);
  }
}

export async function onModuleCompleted(userId: number) {
  try {
    await touchStreak(userId);
    await addXp(userId, 60);

    const points = await getSettingInt("module_points", 100);
    await db
      .update(studentProfiles)
      .set({ totalPoints: sql`${studentProfiles.totalPoints} + ${points}` })
      .where(eq(studentProfiles.userId, userId));

    const [{ done }] = await db
      .select({ done: count() })
      .from(moduleProgress)
      .where(and(eq(moduleProgress.userId, userId), eq(moduleProgress.completed, true)));
    const [{ total }] = await db
      .select({ total: count() })
      .from(modules)
      .where(eq(modules.isPublished, true));

    const slugs: string[] = [];
    if (Number(done) >= 1) slugs.push("first-module");
    if (Number(done) >= 3) slugs.push("module-x3");
    if (Number(total) > 0 && Number(done) >= Number(total)) slugs.push("course-complete");
    await award(userId, slugs);
  } catch (e) {
    console.error("gamification.onModuleCompleted", e);
  }
}

export async function onQuizPassed(
  userId: number,
  percent: number,
  attemptNumber: number,
  passingScore: number
) {
  try {
    await touchStreak(userId);
    await addXp(userId, 40 + Math.floor(Math.max(0, percent - passingScore) / 2));

    const slugs: string[] = [];
    if (attemptNumber === 1) slugs.push("quiz-first-try");
    if (percent >= 100) slugs.push("perfect-score");
    await award(userId, slugs);
  } catch (e) {
    console.error("gamification.onQuizPassed", e);
  }
}

export async function onGameRun(userId: number, difficulty: string, score: number) {
  try {
    await touchStreak(userId);
    const [{ runs }] = await db
      .select({ runs: count() })
      .from(gameScores)
      .where(eq(gameScores.userId, userId));

    const slugs: string[] = [];
    if (Number(runs) >= 1) slugs.push("first-game");
    if (Number(runs) >= 10) slugs.push("arcade-regular");
    if (difficulty === "hard" && score >= 900) slugs.push("high-roller");
    return await award(userId, slugs);
  } catch (e) {
    console.error("gamification.onGameRun", e);
    return [];
  }
}

/** Full badge catalogue with this student's earned state. */
export async function badgeCatalog(userId: number) {
  const all = await db.select().from(badges).orderBy(badges.sortOrder);
  const mine = await db
    .select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earnedMap = new Map(mine.map((m) => [m.badgeId, m.earnedAt]));

  return all.map((b) => ({
    ...b,
    earnedAt: earnedMap.get(b.id) ?? null,
  }));
}
