import { and, count, desc, eq, gte, isNull, max, or, sql } from "drizzle-orm";
import {
  db, gameScores, doorQuestions, studentProfiles, auditLogs,
} from "@/db";
import type { Difficulty, GameSlug } from "@/db/schema";
import { addXp, onGameRun } from "./gamification";
import { getSettingInt } from "./settings";

/* ══════════════════════════════════════════════════════════════
   ARCADE

   Three games, three difficulties. Every game normalises its
   result to 0–1000 and the rules below turn that into XP and
   leaderboard points — so scoring stays consistent and the client
   can never invent its own reward.
   ══════════════════════════════════════════════════════════════ */

export const GAMES: Record<
  GameSlug,
  { name: string; tagline: string; blurb: string; icon: string }
> = {
  door: {
    name: "Door Challenge",
    tagline: "Three doors, one right answer.",
    blurb:
      "A question hangs above three doors. Pick correctly and the corridor takes you deeper; pick wrong and it slams in your face.",
    icon: "door-open",
  },
  "packet-run": {
    name: "Packet Run",
    tagline: "You are the packet.",
    blurb:
      "Ride a congested link. Jump collisions, duck broadcast storms, and see how far down the wire you get before you're dropped.",
    icon: "gauge",
  },
  "net-cli": {
    name: "Net CLI",
    tagline: "A real terminal, a real mission.",
    blurb:
      "Configure the device from the command line. Any valid path to the right configuration counts — the objectives tick off as you go.",
    icon: "terminal",
  },
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

/** Default; superadmin can override it in platform settings. */
export const SCORING_RUNS_PER_DAY = 3;

async function scoringRunsAllowed() {
  return getSettingInt("arcade_scoring_runs", SCORING_RUNS_PER_DAY);
}
export const MAX_POINTS_PER_RUN = 100;

export function isGameSlug(v: string): v is GameSlug {
  return v === "door" || v === "packet-run" || v === "net-cli";
}
export function isDifficulty(v: string): v is Difficulty {
  return v === "easy" || v === "medium" || v === "hard";
}

/** Scoring runs already used today for one game. */
export async function scoringRunsToday(userId: number, slug: GameSlug) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ n }] = await db
    .select({ n: count() })
    .from(gameScores)
    .where(
      and(
        eq(gameScores.userId, userId),
        eq(gameScores.gameSlug, slug),
        gte(gameScores.playedAt, startOfDay),
        sql`${gameScores.pointsEarned} > 0`
      )
    );
  return Number(n);
}

export type RunResult = {
  score: number;
  xpGained: number;
  pointsEarned: number;
  capped: boolean;
  runsLeftToday: number;
  bestScore: number;
  newRecord: boolean;
  level: { level: number; leveledUp: boolean };
  newBadges: { name: string; icon: string }[];
};

/** Record a finished run and hand back everything the summary screen shows. */
export async function submitRun(
  userId: number,
  slug: GameSlug,
  difficulty: Difficulty,
  rawScore: number
): Promise<RunResult> {
  const score = Math.max(0, Math.min(1000, Math.round(rawScore)));
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty];

  const [{ best }] = await db
    .select({ best: max(gameScores.score) })
    .from(gameScores)
    .where(and(eq(gameScores.userId, userId), eq(gameScores.gameSlug, slug)));
  const previousBest = Number(best ?? 0);

  const allowed = await scoringRunsAllowed();
  const used = await scoringRunsToday(userId, slug);
  const capped = used >= allowed;
  const pointsEarned = capped
    ? 0
    : Math.min(MAX_POINTS_PER_RUN, Math.round((score / 20) * multiplier));

  await db.insert(gameScores).values({
    userId, gameSlug: slug, difficulty, score, pointsEarned,
  });

  if (pointsEarned > 0) {
    await db
      .update(studentProfiles)
      .set({ totalPoints: sql`${studentProfiles.totalPoints} + ${pointsEarned}` })
      .where(eq(studentProfiles.userId, userId));
  }

  const xpGained = Math.round((score / 10) * multiplier);
  const level = await addXp(userId, xpGained);
  const newBadges = await onGameRun(userId, difficulty, score);

  await db.insert(auditLogs).values({
    event: "arcade.run",
    userId,
    userRole: "student",
    details: `${slug} ${difficulty} ${score}`,
  });

  return {
    score,
    xpGained,
    pointsEarned,
    capped,
    runsLeftToday: Math.max(0, allowed - (capped ? used : used + 1)),
    bestScore: Math.max(previousBest, score),
    newRecord: score > previousBest,
    level: { level: level.level, leveledUp: level.leveledUp },
    newBadges,
  };
}

/** Per-game stats for the arcade hub. */
export async function hubStats(userId: number) {
  const allowed = await scoringRunsAllowed();
  const out: Record<GameSlug, { best: number; runs: number; scoringLeft: number }> =
    {} as never;

  for (const slug of Object.keys(GAMES) as GameSlug[]) {
    const [row] = await db
      .select({ best: max(gameScores.score), runs: count() })
      .from(gameScores)
      .where(and(eq(gameScores.userId, userId), eq(gameScores.gameSlug, slug)));

    out[slug] = {
      best: Number(row?.best ?? 0),
      runs: Number(row?.runs ?? 0),
      scoringLeft: Math.max(0, allowed - (await scoringRunsToday(userId, slug))),
    };
  }
  return out;
}

/**
 * Door Challenge questions for a student: the global pool plus their
 * own professor's additions, so an arcade is never empty.
 */
export async function doorQuestionsFor(
  userId: number,
  difficulty: Difficulty,
  limit = 10
) {
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, userId),
  });

  const ownership = profile?.instructorId
    ? or(
        isNull(doorQuestions.instructorId),
        eq(doorQuestions.instructorId, profile.instructorId)
      )
    : isNull(doorQuestions.instructorId);

  /* Hard runs blend in medium questions so the pool stays deep. */
  const difficultyFilter =
    difficulty === "hard"
      ? or(eq(doorQuestions.difficulty, "hard"), eq(doorQuestions.difficulty, "medium"))
      : eq(doorQuestions.difficulty, difficulty);

  return db
    .select({
      id: doorQuestions.id,
      question: doorQuestions.question,
      optionA: doorQuestions.optionA,
      optionB: doorQuestions.optionB,
      optionC: doorQuestions.optionC,
      correctOption: doorQuestions.correctOption,
      explanation: doorQuestions.explanation,
    })
    .from(doorQuestions)
    .where(and(eq(doorQuestions.active, true), ownership, difficultyFilter))
    .orderBy(sql`random()`)
    .limit(limit);
}

/** Leaderboard rows, scoped to a class, a section, or everyone. */
export async function leaderboard(
  userId: number,
  scope: "class" | "section" | "all"
) {
  const me = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, userId),
  });

  const rows = await db.query.studentProfiles.findMany({
    orderBy: (t, { desc: d }) => [d(t.totalPoints)],
    limit: 100,
  });

  const filtered = rows.filter((r) => {
    if (scope === "section") return r.sectionId === me?.sectionId;
    if (scope === "class") return r.instructorId === me?.instructorId;
    return true;
  });

  return filtered;
}
