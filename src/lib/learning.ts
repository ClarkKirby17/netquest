import { and, asc, count, eq, inArray } from "drizzle-orm";
import {
  db, modules, lessons, lessonProgress, moduleProgress, notifications, auditLogs,
  quizzes, quizAttempts, studentProfiles,
} from "@/db";
import { resolveQuizFor } from "./quiz";
import { onLessonCompleted, onModuleCompleted } from "./gamification";

/* ══════════════════════════════════════════════════════════════
   LEARNING ENGINE

   The one rule that matters: unlocking is decided here, on the
   server. The client never gets to say which page it may read.
   ══════════════════════════════════════════════════════════════ */

export const PAGE_MARKER = "[[page]]";

/** Split lesson HTML on a paragraph containing exactly [[page]]. */
export function splitPages(html: string): string[] {
  if (!html?.trim()) return ["<p></p>"];
  const parts = html
    .split(/<p>\s*\[\[page\]\]\s*<\/p>/gi)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts : [html];
}

export type ModuleState = "locked" | "available" | "completed";

export type ModuleCard = {
  id: number;
  moduleNumber: number;
  title: string;
  description: string;
  lessonCount: number;
  lessonsDone: number;
  state: ModuleState;
  percent: number;
  /* A module with a published quiz isn't finished until it's passed. */
  lessonsComplete: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
};

/**
 * Published modules in order, each tagged with its unlock state.
 * Module n unlocks only when module n-1 is complete.
 */
export async function modulesForStudent(userId: number): Promise<ModuleCard[]> {
  const published = await db
    .select()
    .from(modules)
    .where(eq(modules.isPublished, true))
    .orderBy(asc(modules.moduleNumber));

  if (published.length === 0) return [];
  const ids = published.map((m) => m.id);

  const lessonRows = await db
    .select({ id: lessons.id, moduleId: lessons.moduleId })
    .from(lessons)
    .where(inArray(lessons.moduleId, ids));

  const doneRows = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.completed, true)));
  const doneSet = new Set(doneRows.map((r) => r.lessonId));

  /* Which quiz applies to THIS student for each module: their own
     professor's if it exists, otherwise the admin default. */
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, userId),
  });

  const quizRows = await db
    .select({
      id: quizzes.id,
      moduleId: quizzes.moduleId,
      instructorId: quizzes.instructorId,
    })
    .from(quizzes)
    .where(and(inArray(quizzes.moduleId, ids), eq(quizzes.isPublished, true)));

  const quizByModule = new Map<number, number>();
  for (const m of ids) {
    const own = profile?.instructorId
      ? quizRows.find((q) => q.moduleId === m && q.instructorId === profile.instructorId)
      : undefined;
    const fallback = quizRows.find((q) => q.moduleId === m && q.instructorId === null);
    const chosen = own ?? fallback;
    if (chosen) quizByModule.set(m, chosen.id);
  }

  const passedRows = quizRows.length
    ? await db
        .select({ quizId: quizAttempts.quizId })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, true)))
    : [];
  const passedSet = new Set(passedRows.map((r) => r.quizId));

  const cards: ModuleCard[] = [];
  let previousComplete = true; // module 1 is always reachable

  for (const m of published) {
    const inModule = lessonRows.filter((l) => l.moduleId === m.id);
    const lessonCount = inModule.length;
    const lessonsDone = inModule.filter((l) => doneSet.has(l.id)).length;
    const lessonsComplete = lessonCount > 0 && lessonsDone === lessonCount;

    const quizId = quizByModule.get(m.id);
    const hasQuiz = quizId !== undefined;
    const quizPassed = hasQuiz ? passedSet.has(quizId) : false;

    /* Lessons alone finish a module only when there's no quiz. */
    const complete = lessonsComplete && (!hasQuiz || quizPassed);

    const state: ModuleState = complete
      ? "completed"
      : previousComplete
        ? "available"
        : "locked";

    cards.push({
      id: m.id,
      moduleNumber: m.moduleNumber,
      title: m.title,
      description: m.description,
      lessonCount,
      lessonsDone,
      state,
      percent: lessonCount ? Math.round((lessonsDone / lessonCount) * 100) : 0,
      lessonsComplete,
      hasQuiz,
      quizPassed,
    });

    previousComplete = complete;
  }

  return cards;
}

/** Lessons in a module with their completion + unlock state. */
export async function lessonsForStudent(userId: number, moduleId: number) {
  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(asc(lessons.lessonOrder));

  const progress = await db
    .select()
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));
  const byLesson = new Map(progress.map((p) => [p.lessonId, p]));

  let previousComplete = true;
  return rows.map((l) => {
    const p = byLesson.get(l.id);
    const completed = p?.completed ?? false;
    const state: ModuleState = completed
      ? "completed"
      : previousComplete
        ? "available"
        : "locked";
    previousComplete = completed;
    return {
      id: l.id,
      order: l.lessonOrder,
      title: l.title,
      state,
      furthestPage: p?.furthestPage ?? 0,
      completed,
    };
  });
}

/**
 * Everything the reader needs, with access already checked.
 * Returns null when the student may not open this lesson.
 *
 * This used to call modulesForStudent() and lessonsForStudent(), which
 * between them issued about ten sequential queries — painful when the
 * database is a continent away. It now gathers the same facts in four.
 */
export async function readerContext(userId: number, lessonId: number) {
  /* 1. the lesson and its module in one join */
  const rows = await db
    .select({
      lesson: lessons,
      module: modules,
    })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (rows.length === 0) return null;
  const { lesson, module: mod } = rows[0];
  if (!mod.isPublished) return null;

  /* 2. every published module, ordered — needed to know which ones
        come before this one in the unlock chain */
  const published = await db
    .select({ id: modules.id, moduleNumber: modules.moduleNumber })
    .from(modules)
    .where(eq(modules.isPublished, true))
    .orderBy(asc(modules.moduleNumber));

  const earlierIds = published
    .filter((m) => m.moduleNumber < mod.moduleNumber)
    .map((m) => m.id);

  /* 3. all lessons in this module plus every earlier one, in a single
        query, with this student's progress attached */
  const relevantModuleIds = [...earlierIds, mod.id];
  const lessonRows = await db
    .select({
      id: lessons.id,
      moduleId: lessons.moduleId,
      order: lessons.lessonOrder,
      title: lessons.title,
      completed: lessonProgress.completed,
      furthestPage: lessonProgress.furthestPage,
    })
    .from(lessons)
    .leftJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId))
    )
    .where(inArray(lessons.moduleId, relevantModuleIds))
    .orderBy(asc(lessons.lessonOrder));

  /* Is every earlier module finished? Lessons first… */
  const earlierLessons = lessonRows.filter((l) => earlierIds.includes(l.moduleId));
  const earlierAllRead =
    earlierLessons.length > 0 ? earlierLessons.every((l) => l.completed === true) : true;

  /* …then their quizzes, if any are published. One query covers them. */
  let earlierQuizzesPassed = true;
  if (earlierAllRead && earlierIds.length > 0) {
    const quizRows = await db
      .select({ quizId: quizzes.id, passed: quizAttempts.passed })
      .from(quizzes)
      .leftJoin(
        quizAttempts,
        and(
          eq(quizAttempts.quizId, quizzes.id),
          eq(quizAttempts.userId, userId),
          eq(quizAttempts.passed, true)
        )
      )
      .where(and(inArray(quizzes.moduleId, earlierIds), eq(quizzes.isPublished, true)));

    const byQuiz = new Map<number, boolean>();
    for (const r of quizRows) {
      byQuiz.set(r.quizId, byQuiz.get(r.quizId) || r.passed === true);
    }
    earlierQuizzesPassed = Array.from(byQuiz.values()).every(Boolean);
  }

  /* The module is locked unless everything before it is done. */
  if (!earlierAllRead || !earlierQuizzesPassed) return null;

  /* Within the module, a lesson unlocks once the previous one is read. */
  const siblings = lessonRows
    .filter((l) => l.moduleId === mod.id)
    .sort((a, b) => a.order - b.order);

  const index = siblings.findIndex((l) => l.id === lessonId);
  if (index === -1) return null;
  if (index > 0 && siblings[index - 1].completed !== true) return null;

  const me = siblings[index];
  const pages = splitPages(lesson.contentHtml);

  return {
    lesson,
    module: mod,
    pages,
    furthestPage: Math.min(me.furthestPage ?? 0, pages.length - 1),
    completed: me.completed === true,
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
    position: { index: index + 1, total: siblings.length },
  };
}

/**
 * Record that a page was read. Server decides what's legal:
 * you may only advance to a page you can already reach.
 */
export async function completePage(userId: number, lessonId: number, pageIndex: number) {
  const ctx = await readerContext(userId, lessonId);
  if (!ctx) return { ok: false as const };

  const maxIndex = ctx.pages.length - 1;
  if (pageIndex < 0 || pageIndex > maxIndex) return { ok: false as const };
  // No skipping: the requested page must be at most one beyond the furthest.
  if (pageIndex > ctx.furthestPage + 1) return { ok: false as const };

  const isLast = pageIndex >= maxIndex;
  const furthest = Math.max(ctx.furthestPage, pageIndex);

  await db
    .insert(lessonProgress)
    .values({
      userId,
      lessonId,
      furthestPage: furthest,
      completed: isLast,
      completedAt: isLast ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        furthestPage: furthest,
        ...(isLast ? { completed: true, completedAt: new Date() } : {}),
      },
    });

  let moduleCompleted = false;
  if (isLast) {
    /* Only award on the transition, not on every re-read. */
    if (!ctx.completed) await onLessonCompleted(userId);
    moduleCompleted = await checkModuleCompletion(userId, ctx.module.id);
  }

  return { ok: true as const, lessonCompleted: isLast, moduleCompleted };
}

/** Mark the module complete once every lesson in it is done. */
async function checkModuleCompletion(userId: number, moduleId: number): Promise<boolean> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId));

  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .innerJoin(
      lessonProgress,
      and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId))
    )
    .where(and(eq(lessons.moduleId, moduleId), eq(lessonProgress.completed, true)));

  if (Number(total) === 0 || rows.length < Number(total)) return false;

  /* Lessons are done — but if a published quiz exists, the module
     only completes once it's passed. */
  const quiz = await resolveQuizFor(userId, moduleId);
  if (quiz) {
    const passed = await db.query.quizAttempts.findFirst({
      where: and(
        eq(quizAttempts.quizId, quiz.id),
        eq(quizAttempts.userId, userId),
        eq(quizAttempts.passed, true)
      ),
    });
    if (!passed) return false;
  }

  const existing = await db.query.moduleProgress.findFirst({
    where: and(eq(moduleProgress.userId, userId), eq(moduleProgress.moduleId, moduleId)),
  });
  if (existing?.completed) return true;

  await db
    .insert(moduleProgress)
    .values({ userId, moduleId, completed: true, completedAt: new Date() })
    .onConflictDoUpdate({
      target: [moduleProgress.userId, moduleProgress.moduleId],
      set: { completed: true, completedAt: new Date() },
    });

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  await db.insert(notifications).values({
    userId,
    title: `Module complete: ${mod?.title ?? ""} 🎉`,
    body: "Nice work. The next module is unlocked.",
    link: "/student/modules",
  });
  await db.insert(auditLogs).values({
    event: "module.completed",
    userId,
    userRole: "student",
    details: `module:${moduleId}`,
  });

  await onModuleCompleted(userId);

  return true;
}

/** Headline numbers for the student dashboard. */
export async function overallStats(userId: number) {
  const cards = await modulesForStudent(userId);
  const totalLessons = cards.reduce((n, c) => n + c.lessonCount, 0);
  const doneLessons = cards.reduce((n, c) => n + c.lessonsDone, 0);
  return {
    modulesTotal: cards.length,
    modulesDone: cards.filter((c) => c.state === "completed").length,
    lessonsTotal: totalLessons,
    lessonsDone: doneLessons,
    percent: totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0,
    current: cards.find((c) => c.state === "available") ?? null,
  };
}

/** Re-evaluate a module after a quiz pass, so completion + unlocking catch up. */
export async function refreshModuleCompletion(userId: number, moduleId: number) {
  return checkModuleCompletion(userId, moduleId);
}
