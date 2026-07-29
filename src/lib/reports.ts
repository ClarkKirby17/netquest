import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
  db, users, studentProfiles, courses, sections, modules, lessons,
  lessonProgress, moduleProgress, quizzes, quizAttempts, gameScores,
  gamification,
} from "@/db";

/* Every dataset takes an optional instructorId. Pass it and the query
   is scoped to that professor's students; omit it for platform-wide.
   One set of queries, two audiences. */

function scoped(instructorId?: number) {
  return instructorId
    ? eq(studentProfiles.instructorId, instructorId)
    : sql`true`;
}

export async function studentProgressReport(instructorId?: number) {
  const [{ totalModules }] = await db
    .select({ totalModules: count() })
    .from(modules)
    .where(eq(modules.isPublished, true));
  const [{ totalLessons }] = await db
    .select({ totalLessons: count() })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(modules.isPublished, true));

  const rows = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      status: users.status,
      course: courses.name,
      section: sections.name,
      professor: sql<string>`prof.full_name`,
      points: studentProfiles.totalPoints,
      badges: studentProfiles.badgeCount,
      level: gamification.level,
      xp: gamification.xp,
      streak: gamification.streakDays,
      joined: users.createdAt,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .innerJoin(courses, eq(courses.id, studentProfiles.courseId))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .leftJoin(gamification, eq(gamification.userId, studentProfiles.userId))
    .leftJoin(sql`users as prof`, sql`prof.id = ${studentProfiles.instructorId}`)
    .where(scoped(instructorId))
    .orderBy(users.fullName);

  /* Two grouped queries instead of two per student — the previous
     version issued 2N round trips for N students. */
  const [lessonCounts, moduleCounts] = await Promise.all([
    db.select({ userId: lessonProgress.userId, n: count() })
      .from(lessonProgress)
      .where(eq(lessonProgress.completed, true))
      .groupBy(lessonProgress.userId),
    db.select({ userId: moduleProgress.userId, n: count() })
      .from(moduleProgress)
      .where(eq(moduleProgress.completed, true))
      .groupBy(moduleProgress.userId),
  ]);

  const lessonMap = new Map(lessonCounts.map((r) => [r.userId, Number(r.n)]));
  const moduleMap = new Map(moduleCounts.map((r) => [r.userId, Number(r.n)]));

  return rows.map((r) => ({
    ...r,
    lessonsDone: `${lessonMap.get(r.id) ?? 0}/${Number(totalLessons)}`,
    modulesDone: `${moduleMap.get(r.id) ?? 0}/${Number(totalModules)}`,
    joined: new Date(r.joined).toISOString().slice(0, 10),
  }));
}

export async function quizResultsReport(instructorId?: number) {
  return db
    .select({
      name: users.fullName,
      email: users.email,
      section: sections.name,
      module: sql<string>`concat('M', ${modules.moduleNumber}, ' · ', ${modules.title})`,
      attempts: count(quizAttempts.id),
      best: sql<number>`max(${quizAttempts.percent})`,
      passed: sql<string>`case when bool_or(${quizAttempts.passed}) then 'yes' else 'no' end`,
      last: sql<string>`to_char(max(${quizAttempts.submittedAt}), 'YYYY-MM-DD HH24:MI')`,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .innerJoin(users, eq(users.id, quizAttempts.userId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .where(scoped(instructorId))
    .groupBy(users.fullName, users.email, sections.name, modules.moduleNumber, modules.title, quizAttempts.quizId, quizAttempts.userId)
    .orderBy(users.fullName);
}

export async function arcadeReport(instructorId?: number) {
  return db
    .select({
      name: users.fullName,
      email: users.email,
      game: gameScores.gameSlug,
      runs: count(gameScores.id),
      best: sql<number>`max(${gameScores.score})`,
      points: sql<number>`sum(${gameScores.pointsEarned})`,
      last: sql<string>`to_char(max(${gameScores.playedAt}), 'YYYY-MM-DD HH24:MI')`,
    })
    .from(gameScores)
    .innerJoin(users, eq(users.id, gameScores.userId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(scoped(instructorId))
    .groupBy(users.fullName, users.email, gameScores.gameSlug, gameScores.userId)
    .orderBy(users.fullName);
}

export async function leaderboardReport(instructorId?: number) {
  const rows = await db
    .select({
      name: users.fullName,
      email: users.email,
      course: courses.name,
      section: sections.name,
      points: studentProfiles.totalPoints,
      badges: studentProfiles.badgeCount,
      level: gamification.level,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .innerJoin(courses, eq(courses.id, studentProfiles.courseId))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .leftJoin(gamification, eq(gamification.userId, studentProfiles.userId))
    .where(and(eq(users.status, "active"), scoped(instructorId)))
    .orderBy(desc(studentProfiles.totalPoints));

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

/** Rows → CSV, with a BOM so Excel opens UTF-8 correctly. */
export function toCsv(header: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const row of rows) lines.push(Object.values(row).map(esc).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

export function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/* ───────────────────────── analytics ───────────────────────── */

export async function analytics(instructorId?: number) {
  /* Deliberately sequential.
     Firing these in parallel over Supabase's transaction pooler made
     the driver pipeline parameterised statements on shared
     connections, which crossed parameter bindings. Each query here is
     a simple aggregate over a small table, so running them in order
     costs a few hundred milliseconds and is completely predictable. */
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const byInstructor = instructorId !== undefined;

  const studentRows = byInstructor
    ? await db.select({ n: count() }).from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .where(and(eq(users.status, "active"), eq(studentProfiles.instructorId, instructorId)))
    : await db.select({ n: count() }).from(users)
        .where(and(eq(users.role, "student"), eq(users.status, "active")));
  const students = Number(studentRows[0]?.n ?? 0);

  const moduleCountRows = await db
    .select({ n: count() })
    .from(modules)
    .where(eq(modules.isPublished, true));

  const attemptRows = byInstructor
    ? await db.select({ n: count() }).from(quizAttempts)
        .innerJoin(studentProfiles, eq(studentProfiles.userId, quizAttempts.userId))
        .where(eq(studentProfiles.instructorId, instructorId))
    : await db.select({ n: count() }).from(quizAttempts);

  const passRows = byInstructor
    ? await db.select({ n: count() }).from(quizAttempts)
        .innerJoin(studentProfiles, eq(studentProfiles.userId, quizAttempts.userId))
        .where(and(eq(quizAttempts.passed, true), eq(studentProfiles.instructorId, instructorId)))
    : await db.select({ n: count() }).from(quizAttempts).where(eq(quizAttempts.passed, true));

  const attempts = Number(attemptRows[0]?.n ?? 0);
  const passes = Number(passRows[0]?.n ?? 0);

  const moduleRows = await db
    .select({
      moduleNumber: modules.moduleNumber,
      title: modules.title,
      done: count(moduleProgress.id),
    })
    .from(modules)
    .leftJoin(
      moduleProgress,
      and(eq(moduleProgress.moduleId, modules.id), eq(moduleProgress.completed, true))
    )
    .where(eq(modules.isPublished, true))
    .groupBy(modules.id)
    .orderBy(modules.moduleNumber);

  const quizRows = await db
    .select({
      moduleNumber: modules.moduleNumber,
      title: modules.title,
      attempts: count(quizAttempts.id),
    })
    .from(quizzes)
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .leftJoin(quizAttempts, eq(quizAttempts.quizId, quizzes.id))
    .where(eq(quizzes.isPublished, true))
    .groupBy(modules.moduleNumber, modules.title)
    .orderBy(modules.moduleNumber);

  const quizPassRows = await db
    .select({
      moduleNumber: modules.moduleNumber,
      passed: count(quizAttempts.id),
    })
    .from(quizzes)
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .leftJoin(
      quizAttempts,
      and(eq(quizAttempts.quizId, quizzes.id), eq(quizAttempts.passed, true))
    )
    .where(eq(quizzes.isPublished, true))
    .groupBy(modules.moduleNumber);
  const passByModule = new Map(
    quizPassRows.map((r) => [r.moduleNumber, Number(r.passed)])
  );

  const arcadeRows = byInstructor
    ? await db.select({ game: gameScores.gameSlug, runs: count() })
        .from(gameScores)
        .innerJoin(studentProfiles, eq(studentProfiles.userId, gameScores.userId))
        .where(and(gte(gameScores.playedAt, weekAgo), eq(studentProfiles.instructorId, instructorId)))
        .groupBy(gameScores.gameSlug)
    : await db.select({ game: gameScores.gameSlug, runs: count() })
        .from(gameScores)
        .where(gte(gameScores.playedAt, weekAgo))
        .groupBy(gameScores.gameSlug);

  const levelRows = byInstructor
    ? await db.select({ level: gamification.level, n: count() })
        .from(gamification)
        .innerJoin(studentProfiles, eq(studentProfiles.userId, gamification.userId))
        .where(eq(studentProfiles.instructorId, instructorId))
        .groupBy(gamification.level)
        .orderBy(gamification.level)
    : await db.select({ level: gamification.level, n: count() })
        .from(gamification)
        .groupBy(gamification.level)
        .orderBy(gamification.level);

  const stalledRows = byInstructor
    ? await db.select({
          title: lessons.title,
          moduleNumber: modules.moduleNumber,
          stuck: count(lessonProgress.id),
        })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(studentProfiles, eq(studentProfiles.userId, lessonProgress.userId))
        .where(and(eq(lessonProgress.completed, false), eq(studentProfiles.instructorId, instructorId)))
        .groupBy(lessons.title, modules.moduleNumber)
        .orderBy(desc(count(lessonProgress.id)))
        .limit(5)
    : await db.select({
          title: lessons.title,
          moduleNumber: modules.moduleNumber,
          stuck: count(lessonProgress.id),
        })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .where(eq(lessonProgress.completed, false))
        .groupBy(lessons.title, modules.moduleNumber)
        .orderBy(desc(count(lessonProgress.id)))
        .limit(5);

  const topRows = byInstructor
    ? await db.select({
          name: users.fullName,
          section: sections.name,
          points: studentProfiles.totalPoints,
          level: gamification.level,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
        .leftJoin(gamification, eq(gamification.userId, studentProfiles.userId))
        .where(and(eq(users.status, "active"), eq(studentProfiles.instructorId, instructorId)))
        .orderBy(desc(studentProfiles.totalPoints))
        .limit(5)
    : await db.select({
          name: users.fullName,
          section: sections.name,
          points: studentProfiles.totalPoints,
          level: gamification.level,
        })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
        .leftJoin(gamification, eq(gamification.userId, studentProfiles.userId))
        .where(eq(users.status, "active"))
        .orderBy(desc(studentProfiles.totalPoints))
        .limit(5);

  return {
    kpis: {
      students,
      modules: Number(moduleCountRows[0]?.n ?? 0),
      attempts,
      passRate: attempts ? Math.round((passes / attempts) * 100) : 0,
      arcadeRuns: arcadeRows.reduce((n, r) => n + Number(r.runs), 0),
    },
    funnel: moduleRows.map((m) => ({
      label: `M${m.moduleNumber}`,
      title: m.title,
      value: students ? Math.round((Number(m.done) / students) * 100) : 0,
    })),
    quizRates: quizRows.map((q) => {
      const total = Number(q.attempts);
      const passed = passByModule.get(q.moduleNumber) ?? 0;
      return {
        label: `M${q.moduleNumber}`,
        title: q.title,
        attempts: total,
        value: total ? Math.round((passed / total) * 100) : 0,
      };
    }),
    arcade: arcadeRows.map((r) => ({ label: r.game, value: Number(r.runs) })),
    levels: levelRows.map((r) => ({ label: `Lv ${r.level}`, value: Number(r.n) })),
    stalled: stalledRows.map((s) => ({ ...s, stuck: Number(s.stuck) })),
    topStudents: topRows,
  };
}
