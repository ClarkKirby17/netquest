import { notFound } from "next/navigation";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db, modules, quizzes, quizQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import QuizEditor from "@/components/quiz/QuizEditor";

export default async function InstructorQuizEditor({
  params }: {
  params: Promise<{ moduleId: string }>;
}) {
  const me = await requireRole("instructor");
  const { moduleId: raw } = await params;
  const moduleId = Number(raw);
  if (!moduleId) notFound();

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  if (!mod) notFound();

  /* Scoped to this instructor — nobody edits another's quiz. */
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.moduleId, moduleId), eq(quizzes.instructorId, me.userId)) });
  if (!quiz) notFound();

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.sortOrder), asc(quizQuestions.id));

  const fallback = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.moduleId, moduleId), isNull(quizzes.instructorId)) });
  let defaultQuestionCount = 0;
  if (fallback) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, fallback.id));
    defaultQuestionCount = Number(n);
  }

  return (
    <QuizEditor
      scope="mine"
      moduleId={moduleId}
      moduleNumber={mod.moduleNumber}
      moduleTitle={mod.title}
      quiz={quiz}
      questions={questions}
      defaultQuestionCount={defaultQuestionCount}
    />
  );
}
