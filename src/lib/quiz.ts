import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import {
  db, quizzes, quizQuestions, quizAttempts, modules, notifications, auditLogs,
  studentProfiles,
} from "@/db";
import { onQuizPassed } from "./gamification";

/* ══════════════════════════════════════════════════════════════
   QUIZ ENGINE

   Grading happens here and only here. The client is never sent
   correctOption before a submission, and never decides a score.
   ══════════════════════════════════════════════════════════════ */

export type QuizStatus =
  | "none"        // no published quiz for this module
  | "locked"      // lessons aren't finished yet
  | "available"   // ready to take
  | "cooldown"    // must wait before retrying
  | "exhausted"   // attempt limit reached, never passed
  | "passed";

export type QuizState = {
  status: QuizStatus;
  quizId?: number;
  title?: string;
  passingScore: number;
  maxAttempts: number;
  cooldownMinutes: number;
  attemptsUsed: number;
  bestPercent: number;
  lastAttemptId?: number;
  retryAt?: Date;
  questionCount: number;
};

const EMPTY: QuizState = {
  status: "none",
  passingScore: 70,
  maxAttempts: 0,
  cooldownMinutes: 0,
  attemptsUsed: 0,
  bestPercent: 0,
  questionCount: 0,
};

/**
 * Which published quiz a given student actually takes for a module.
 *
 * Resolution order:
 *   1. their own professor's quiz
 *   2. the admin default (instructorId null)
 *   3. none — the module then completes on lessons alone, so a
 *      professor who hasn't written one never traps their students
 */
export async function resolveQuizFor(studentId: number, moduleId: number) {
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, studentId),
  });

  if (profile?.instructorId) {
    const own = await db.query.quizzes.findFirst({
      where: and(
        eq(quizzes.moduleId, moduleId),
        eq(quizzes.instructorId, profile.instructorId),
        eq(quizzes.isPublished, true)
      ),
    });
    if (own) return own;
  }

  return (
    (await db.query.quizzes.findFirst({
      where: and(
        eq(quizzes.moduleId, moduleId),
        isNull(quizzes.instructorId),
        eq(quizzes.isPublished, true)
      ),
    })) ?? null
  );
}

/**
 * Where a student stands with a module's quiz.
 * `lessonsComplete` comes from the learning engine — a quiz stays
 * locked until every lesson in the module is read.
 */
export async function quizStateFor(
  userId: number,
  moduleId: number,
  lessonsComplete: boolean
): Promise<QuizState> {
  const quiz = await resolveQuizFor(userId, moduleId);
  if (!quiz) return EMPTY;

  const [{ n: questionCount }] = await db
    .select({ n: count() })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id));

  const base = {
    quizId: quiz.id,
    title: quiz.title,
    passingScore: quiz.passingScore,
    maxAttempts: quiz.maxAttempts,
    cooldownMinutes: quiz.cooldownMinutes,
    questionCount: Number(questionCount),
  };

  // A published quiz with no questions is effectively not there.
  if (Number(questionCount) === 0) return { ...EMPTY, ...base, status: "none" };

  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, userId)))
    .orderBy(desc(quizAttempts.submittedAt));

  const attemptsUsed = attempts.length;
  const bestPercent = attempts.reduce((b, a) => Math.max(b, a.percent), 0);
  const passed = attempts.some((a) => a.passed);
  const last = attempts[0];

  if (passed) {
    return {
      ...base, ...{ attemptsUsed, bestPercent, status: "passed" as const, lastAttemptId: last?.id },
    };
  }
  if (!lessonsComplete) {
    return { ...base, attemptsUsed, bestPercent, status: "locked", lastAttemptId: last?.id };
  }
  if (quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts) {
    return { ...base, attemptsUsed, bestPercent, status: "exhausted", lastAttemptId: last?.id };
  }
  if (quiz.cooldownMinutes > 0 && last) {
    const retryAt = new Date(last.submittedAt.getTime() + quiz.cooldownMinutes * 60_000);
    if (retryAt > new Date()) {
      return { ...base, attemptsUsed, bestPercent, status: "cooldown", retryAt, lastAttemptId: last.id };
    }
  }
  return { ...base, attemptsUsed, bestPercent, status: "available", lastAttemptId: last?.id };
}

/** Questions for taking a quiz — correctOption and explanation stripped. */
export async function questionsForAttempt(quizId: number) {
  const rows = await db
    .select({
      id: quizQuestions.id,
      type: quizQuestions.type,
      question: quizQuestions.question,
      optionA: quizQuestions.optionA,
      optionB: quizQuestions.optionB,
      optionC: quizQuestions.optionC,
      optionD: quizQuestions.optionD,
      imagePath: quizQuestions.imagePath,
      points: quizQuestions.points,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.sortOrder), asc(quizQuestions.id));

  // Shuffle so consecutive attempts aren't identical.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows;
}

/**
 * Grade and record an attempt. Answers arrive as { questionId: "A" }.
 * Returns the attempt id so the caller can show the result page.
 */
export async function gradeAttempt(
  userId: number,
  quizId: number,
  answers: Record<string, string>
) {
  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
  if (!quiz) throw new Error("Quiz not found.");

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));
  if (questions.length === 0) throw new Error("This quiz has no questions.");

  let score = 0;
  let maxScore = 0;
  const clean: Record<string, string> = {};

  for (const q of questions) {
    maxScore += q.points;
    const given = String(answers[String(q.id)] ?? "").toUpperCase().slice(0, 1);
    if (given) clean[String(q.id)] = given;
    if (given && given === q.correctOption.toUpperCase()) score += q.points;
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percent >= quiz.passingScore;

  const [{ n: prior }] = await db
    .select({ n: count() })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)));

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      quizId,
      userId,
      attemptNumber: Number(prior) + 1,
      score,
      maxScore,
      percent,
      passed,
      answers: clean,
    })
    .returning({ id: quizAttempts.id });

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, quiz.moduleId) });

  await db.insert(notifications).values({
    userId,
    title: passed
      ? `Quiz passed: ${mod?.title ?? quiz.title} ✓`
      : `Quiz attempt: ${percent}%`,
    body: passed
      ? "The next module is unlocked. Nice work."
      : `You need ${quiz.passingScore}% to pass. Review the answers and try again.`,
    link: `/student/quizzes/${quizId}/result`,
  });

  await db.insert(auditLogs).values({
    event: passed ? "quiz.passed" : "quiz.failed",
    userId,
    userRole: "student",
    details: `quiz:${quizId} ${percent}%`,
  });

  if (passed) {
    await onQuizPassed(userId, percent, Number(prior) + 1, quiz.passingScore);
  }

  return { attemptId: attempt.id, percent, passed, score, maxScore };
}

/** Full review of one attempt: what they chose, what was right, and why. */
export async function attemptReview(userId: number, attemptId: number) {
  const attempt = await db.query.quizAttempts.findFirst({
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)),
  });
  if (!attempt) return null;

  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, attempt.quizId) });
  if (!quiz) return null;

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, quiz.moduleId) });

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, attempt.quizId))
    .orderBy(asc(quizQuestions.sortOrder), asc(quizQuestions.id));

  const given = (attempt.answers ?? {}) as Record<string, string>;

  return {
    attempt,
    quiz,
    module: mod,
    items: questions.map((q) => {
      const chosen = given[String(q.id)] ?? null;
      return {
        id: q.id,
        question: q.question,
        options: [
          ["A", q.optionA],
          ["B", q.optionB],
          ["C", q.optionC],
          ["D", q.optionD],
        ].filter(([, text]) => Boolean(text)) as [string, string][],
        correct: q.correctOption.toUpperCase(),
        chosen,
        right: chosen === q.correctOption.toUpperCase(),
        explanation: q.explanation,
        points: q.points,
      };
    }),
  };
}
