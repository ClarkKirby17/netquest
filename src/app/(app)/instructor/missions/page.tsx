import { asc, count, eq, isNull } from "drizzle-orm";
import { db, cliMissions, cliObjectives } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import MissionManager, { type MissionRow } from "@/components/missions/MissionManager";

export default async function InstructorMissionsPage() {
  const me = await requireRole("instructor");

  const rows = await db
    .select()
    .from(cliMissions)
    .where(eq(cliMissions.instructorId, me.userId))
    .orderBy(asc(cliMissions.difficulty), asc(cliMissions.id));

  const missions: MissionRow[] = await Promise.all(
    rows.map(async (m) => ({
      ...m,
      objectives: await db
        .select()
        .from(cliObjectives)
        .where(eq(cliObjectives.missionId, m.id))
        .orderBy(asc(cliObjectives.sortOrder), asc(cliObjectives.id)) }))
  );

  const [{ n }] = await db
    .select({ n: count() })
    .from(cliMissions)
    .where(isNull(cliMissions.instructorId));

  return (
    <>
      <PageHead
        eyebrow="arcade"
        title="CLI missions"
        sub="Terminal missions for your students. Objectives grade the resulting config, so any valid path counts."
      />
      <MissionManager scope="mine" missions={missions} globalCount={Number(n)} />
    </>
  );
}
