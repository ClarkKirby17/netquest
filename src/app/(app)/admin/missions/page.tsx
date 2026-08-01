import { asc, eq, isNull } from "drizzle-orm";
import { db, cliMissions, cliObjectives } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead } from "@/components/ui";
import MissionManager, { type MissionRow } from "@/components/missions/MissionManager";

export default async function AdminMissionsPage() {
  await requireRole("admin", "superadmin");

  const rows = await db
    .select()
    .from(cliMissions)
    .where(isNull(cliMissions.instructorId))
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

  return (
    <>
      <PageHead
        eyebrow="arcade"
        title="CLI missions"
        sub="Shared terminal missions. Professors can write their own; these are the fallback."
      />
      <MissionManager scope="global" missions={missions} />
    </>
  );
}
