import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db, modules, quizzes, quizQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import QuizEditor from "@/components/quiz/QuizEditor";

export default async function AdminQuizEditor({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  await requireRole("admin", "superadmin");
  const { moduleId: raw } = await params;
  const moduleId = Number(raw);
  if (!moduleId) notFound();

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  if (!mod) notFound();

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.moduleId, moduleId), isNull(quizzes.instructorId)),
  });
  if (!quiz) notFound();

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.sortOrder), asc(quizQuestions.id));

  return (
    <QuizEditor
      scope="default"
      moduleId={moduleId}
      moduleNumber={mod.moduleNumber}
      moduleTitle={mod.title}
      quiz={quiz}
      questions={questions}
    />
  );
}
