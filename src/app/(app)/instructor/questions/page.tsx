import { asc, count, eq, isNull } from "drizzle-orm";
import { db, doorQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import QuestionManager, { type DoorQ } from "@/components/questions/QuestionManager";

export default async function InstructorQuestionsPage() {
  const me = await requireRole("instructor");

  const rows = await db
    .select()
    .from(doorQuestions)
    .where(eq(doorQuestions.instructorId, me.userId))
    .orderBy(asc(doorQuestions.difficulty), asc(doorQuestions.id));

  const [{ n }] = await db
    .select({ n: count() })
    .from(doorQuestions)
    .where(isNull(doorQuestions.instructorId));

  return (
    <>
      <PageHead
        eyebrow="arcade"
        title="Game questions"
        sub="Your own questions for the Door Challenge, added on top of the shared pool."
      />
      <QuestionManager scope="mine" questions={rows as DoorQ[]} globalCount={Number(n)} />
    </>
  );
}
