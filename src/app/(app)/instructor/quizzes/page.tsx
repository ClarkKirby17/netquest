import { asc, count, eq, isNull, and } from "drizzle-orm";
import { db, modules, quizzes, quizQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import QuizList, { type QuizRow } from "@/components/quiz/QuizList";

export default async function InstructorQuizzesPage() {
  const me = await requireRole("instructor");

  const mods = await db
    .select()
    .from(modules)
    .where(eq(modules.isPublished, true))
    .orderBy(asc(modules.moduleNumber));

  const rows: QuizRow[] = await Promise.all(
    mods.map(async (m) => {
      const mine = await db.query.quizzes.findFirst({
        where: and(eq(quizzes.moduleId, m.id), eq(quizzes.instructorId, me.userId)),
      });
      const fallback = await db.query.quizzes.findFirst({
        where: and(eq(quizzes.moduleId, m.id), isNull(quizzes.instructorId)),
      });

      const countFor = async (quizId?: number) => {
        if (!quizId) return 0;
        const [{ n }] = await db
          .select({ n: count() })
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quizId));
        return Number(n);
      };

      return {
        moduleId: m.id,
        moduleNumber: m.moduleNumber,
        moduleTitle: m.title,
        quizId: mine?.id ?? null,
        published: mine?.isPublished ?? null,
        passingScore: mine?.passingScore ?? null,
        questionCount: await countFor(mine?.id),
        defaultQuestionCount: fallback?.isPublished ? await countFor(fallback.id) : 0,
      };
    })
  );

  return (
    <>
      <PageHead
        eyebrow="assessment"
        title="My quizzes"
        sub="Your own questions, for your own students. Where you haven't written one, the admin default applies."
      />
      <QuizList rows={rows} scope="mine" />
    </>
  );
}
