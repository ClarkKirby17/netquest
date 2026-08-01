import { asc, count, eq, isNull, and } from "drizzle-orm";
import { db, modules, quizzes, quizQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import QuizList, { type QuizRow } from "@/components/quiz/QuizList";

export default async function AdminQuizzesPage() {
  await requireRole("admin", "superadmin");

  const mods = await db.select().from(modules).orderBy(asc(modules.moduleNumber));

  const rows: QuizRow[] = await Promise.all(
    mods.map(async (m) => {
      const q = await db.query.quizzes.findFirst({
        where: and(eq(quizzes.moduleId, m.id), isNull(quizzes.instructorId)) });
      let questionCount = 0;
      if (q) {
        const [{ n }] = await db
          .select({ n: count() })
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, q.id));
        questionCount = Number(n);
      }
      return {
        moduleId: m.id,
        moduleNumber: m.moduleNumber,
        moduleTitle: m.title,
        quizId: q?.id ?? null,
        published: q?.isPublished ?? null,
        passingScore: q?.passingScore ?? null,
        questionCount };
    })
  );

  return (
    <>
      <PageHead
        eyebrow="curriculum"
        title="Default quizzes"
        sub="Templates professors copy — and the fallback students take when their professor hasn't written one."
      />
      <QuizList rows={rows} scope="default" />
    </>
  );
}
