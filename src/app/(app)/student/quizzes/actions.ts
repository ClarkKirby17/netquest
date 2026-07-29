"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, quizzes } from "@/db";
import { requireRole } from "@/lib/guard";
import { gradeAttempt, quizStateFor } from "@/lib/quiz";
import { modulesForStudent, refreshModuleCompletion } from "@/lib/learning";

export async function submitQuiz(formData: FormData) {
  const me = await requireRole("student");
  const quizId = Number(formData.get("quizId"));
  if (!quizId) return;

  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
  if (!quiz) return;

  /* Re-check availability server-side — the page being open doesn't
     mean the attempt is still allowed. */
  const cards = await modulesForStudent(me.userId);
  const card = cards.find((c) => c.id === quiz.moduleId);
  const state = await quizStateFor(me.userId, quiz.moduleId, card?.lessonsComplete ?? false);
  if (!["available", "passed"].includes(state.status)) {
    redirect("/student/quizzes");
  }

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) answers[key.slice(2)] = String(value);
  }

  const result = await gradeAttempt(me.userId, quizId, answers);

  if (result.passed) {
    await refreshModuleCompletion(me.userId, quiz.moduleId);
    revalidatePath("/student/modules");
    revalidatePath("/student");
  }
  revalidatePath("/student/quizzes");

  redirect(`/student/quizzes/${quizId}/result?attempt=${result.attemptId}`);
}
