import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, quizzes, modules } from "@/db";
import { requireRole } from "@/lib/guard";
import { modulesForStudent } from "@/lib/learning";
import { quizStateFor, questionsForAttempt } from "@/lib/quiz";
import QuizRunner from "./QuizRunner";

export default async function TakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("student");
  const { id } = await params;
  const quizId = Number(id);
  if (!quizId) notFound();

  const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, quizId) });
  if (!quiz || !quiz.isPublished) notFound();

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, quiz.moduleId) });
  if (!mod) notFound();

  /* Availability is decided on the server; a bookmarked URL can't
     bypass the lock, the cooldown, or the attempt limit. */
  const cards = await modulesForStudent(me.userId);
  const card = cards.find((c) => c.id === quiz.moduleId);
  const state = await quizStateFor(me.userId, quiz.moduleId, card?.lessonsComplete ?? false);
  if (state.status !== "available") redirect("/student/quizzes");

  const questions = await questionsForAttempt(quizId);

  return (
    <QuizRunner
      quizId={quizId}
      title={quiz.title}
      moduleNumber={mod.moduleNumber}
      moduleTitle={mod.title}
      passingScore={quiz.passingScore}
      attemptNumber={state.attemptsUsed + 1}
      maxAttempts={quiz.maxAttempts}
      questions={questions.map((q) => ({
        id: q.id,
        question: q.question,
        points: q.points,
        options: [
          ["A", q.optionA],
          ["B", q.optionB],
          ["C", q.optionC],
          ["D", q.optionD],
        ].filter(([, t]) => Boolean(t)) as [string, string][] }))}
    />
  );
}
