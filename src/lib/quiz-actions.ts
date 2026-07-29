"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, isNull, max } from "drizzle-orm";
import { db, quizzes, quizQuestions, modules, auditLogs } from "@/db";
import { requireRole } from "@/lib/guard";
import type { Role } from "@/db/schema";

/* Instructors own a quiz scoped to themselves; admins own the shared
   default (instructorId null). Same code path, different owner. */
async function ownerFor(role: Role[], scope: "mine" | "default") {
  const me = await requireRole(...role);
  return { me, ownerId: scope === "default" ? null : me.userId };
}

function basePath(scope: "mine" | "default") {
  return scope === "default" ? "/admin/quizzes" : "/instructor/quizzes";
}

export async function createQuiz(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "default") ?? "mine";
  const roles: Role[] = scope === "default" ? ["admin", "superadmin"] : ["instructor"];
  const { me, ownerId } = await ownerFor(roles, scope);

  const moduleId = Number(formData.get("moduleId"));
  if (!moduleId) return;

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  if (!mod) return;

  const existing = await db.query.quizzes.findFirst({
    where: and(
      eq(quizzes.moduleId, moduleId),
      ownerId === null ? isNull(quizzes.instructorId) : eq(quizzes.instructorId, ownerId)
    ),
  });
  if (existing) redirect(`${basePath(scope)}/${moduleId}`);

  await db.insert(quizzes).values({
    moduleId,
    instructorId: ownerId,
    title: `${mod.title} — Quiz`,
  });
  await db.insert(auditLogs).values({
    event: "quiz.created", userId: me.userId, userRole: me.role, details: mod.title,
  });

  redirect(`${basePath(scope)}/${moduleId}`);
}

/** Copy the admin default's questions into this professor's quiz. */
export async function copyDefaultQuestions(formData: FormData) {
  const me = await requireRole("instructor");
  const quizId = Number(formData.get("quizId"));
  const moduleId = Number(formData.get("moduleId"));
  if (!quizId || !moduleId) return;

  const target = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.instructorId, me.userId)),
  });
  if (!target) return;

  const source = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.moduleId, moduleId), isNull(quizzes.instructorId)),
  });
  if (!source) return;

  const rows = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, source.id));
  if (rows.length === 0) return;

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(quizQuestions.sortOrder) })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId));
  let order = (maxOrder ?? 0) + 1;

  await db.insert(quizQuestions).values(
    rows.map((q) => ({
      quizId,
      type: q.type,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation,
      points: q.points,
      sortOrder: order++,
    }))
  );

  await db.insert(auditLogs).values({
    event: "quiz.copied_default", userId: me.userId, userRole: "instructor",
    details: `module:${moduleId} (${rows.length} questions)`,
  });

  revalidatePath(`/instructor/quizzes/${moduleId}`);
}

export async function updateQuizSettings(formData: FormData) {
  await requireRole("instructor", "admin", "superadmin");
  const id = Number(formData.get("id"));
  const scope = (formData.get("scope") as "mine" | "default") ?? "mine";
  const moduleId = Number(formData.get("moduleId"));
  const title = String(formData.get("title") ?? "").trim();
  const passingScore = Math.min(100, Math.max(1, Number(formData.get("passingScore") || 70)));
  const maxAttempts = Math.max(0, Number(formData.get("maxAttempts") || 0));
  const cooldownMinutes = Math.max(0, Number(formData.get("cooldownMinutes") || 0));
  if (!id || title.length < 2) return;

  await db.update(quizzes)
    .set({ title, passingScore, maxAttempts, cooldownMinutes })
    .where(eq(quizzes.id, id));

  revalidatePath(`${basePath(scope)}/${moduleId}`);
}

export async function toggleQuizPublish(formData: FormData) {
  const me = await requireRole("instructor", "admin", "superadmin");
  const id = Number(formData.get("id"));
  const scope = (formData.get("scope") as "mine" | "default") ?? "mine";
  const moduleId = Number(formData.get("moduleId"));
  const publish = formData.get("publish") === "1";
  if (!id) return;

  if (publish) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, id));
    if (Number(n) === 0) return;
  }

  await db.update(quizzes).set({ isPublished: publish }).where(eq(quizzes.id, id));
  await db.insert(auditLogs).values({
    event: publish ? "quiz.published" : "quiz.unpublished",
    userId: me.userId, userRole: me.role, details: `quiz:${id}`,
  });

  revalidatePath(`${basePath(scope)}/${moduleId}`);
  revalidatePath(basePath(scope));
}

export async function saveQuestion(formData: FormData) {
  await requireRole("instructor", "admin", "superadmin");
  const questionId = Number(formData.get("questionId") || 0);
  const quizId = Number(formData.get("quizId"));
  const scope = (formData.get("scope") as "mine" | "default") ?? "mine";
  const moduleId = Number(formData.get("moduleId"));
  const type = String(formData.get("type") ?? "multiple_choice") as "multiple_choice" | "true_false";
  const question = String(formData.get("question") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();
  const points = Math.max(1, Number(formData.get("points") || 1));
  let correctOption = String(formData.get("correctOption") ?? "A").toUpperCase().slice(0, 1);
  if (!quizId || question.length < 4) return;

  const isTF = type === "true_false";
  const optionA = isTF ? "True" : String(formData.get("optionA") ?? "").trim();
  const optionB = isTF ? "False" : String(formData.get("optionB") ?? "").trim();
  const optionC = isTF ? null : String(formData.get("optionC") ?? "").trim() || null;
  const optionD = isTF ? null : String(formData.get("optionD") ?? "").trim() || null;
  if (!optionA || !optionB) return;

  if (isTF && !["A", "B"].includes(correctOption)) correctOption = "A";
  if (!isTF) {
    const filled: Record<string, string | null> = { A: optionA, B: optionB, C: optionC, D: optionD };
    if (!filled[correctOption]) correctOption = "A";
  }

  if (questionId) {
    await db.update(quizQuestions)
      .set({ type, question, optionA, optionB, optionC, optionD, correctOption, explanation, points })
      .where(eq(quizQuestions.id, questionId));
  } else {
    const [{ maxOrder }] = await db
      .select({ maxOrder: max(quizQuestions.sortOrder) })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));
    await db.insert(quizQuestions).values({
      quizId, type, question, optionA, optionB, optionC, optionD,
      correctOption, explanation, points, sortOrder: (maxOrder ?? 0) + 1,
    });
  }

  revalidatePath(`${basePath(scope)}/${moduleId}`);
}

export async function deleteQuestion(formData: FormData) {
  await requireRole("instructor", "admin", "superadmin");
  const id = Number(formData.get("id"));
  const scope = (formData.get("scope") as "mine" | "default") ?? "mine";
  const moduleId = Number(formData.get("moduleId"));
  if (!id) return;
  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  revalidatePath(`${basePath(scope)}/${moduleId}`);
}
