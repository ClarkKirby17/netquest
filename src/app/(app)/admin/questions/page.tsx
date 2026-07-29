import { asc, isNull } from "drizzle-orm";
import { db, doorQuestions } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import QuestionManager, { type DoorQ } from "@/components/questions/QuestionManager";

export default async function AdminQuestionsPage() {
  await requireRole("admin", "superadmin");

  const rows = await db
    .select()
    .from(doorQuestions)
    .where(isNull(doorQuestions.instructorId))
    .orderBy(asc(doorQuestions.difficulty), asc(doorQuestions.id));

  return (
    <>
      <PageHead
        eyebrow="arcade"
        title="Question pool"
        sub="Shared arcade questions every section draws from. Professors add their own on top."
      />
      <QuestionManager scope="global" questions={rows as DoorQ[]} />
    </>
  );
}
