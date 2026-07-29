import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, cliMissions, cliObjectives, studentProfiles } from "@/db";
import type { Difficulty } from "@/db/schema";
import { describeObjective, type PlayableMission } from "./cli-types";

/* Server-only by convention: this file touches the database, so it
   must never be imported from a "use client" component. Anything the
   browser needs lives in ./cli-types instead. */

export async function missionFor(
  userId: number,
  difficulty: Difficulty
): Promise<PlayableMission | null> {
  const profile = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, userId),
  });

  const pick = async (ownerId: number | null) =>
    db
      .select()
      .from(cliMissions)
      .where(
        and(
          eq(cliMissions.difficulty, difficulty),
          eq(cliMissions.active, true),
          ownerId === null
            ? isNull(cliMissions.instructorId)
            : eq(cliMissions.instructorId, ownerId)
        )
      )
      .orderBy(sql`random()`)
      .limit(1);

  /* Their professor's mission first, the global one as fallback. */
  let rows = profile?.instructorId ? await pick(profile.instructorId) : [];
  if (rows.length === 0) rows = await pick(null);
  if (rows.length === 0) return null;

  const mission = rows[0];
  const objectives = await db
    .select()
    .from(cliObjectives)
    .where(eq(cliObjectives.missionId, mission.id))
    .orderBy(asc(cliObjectives.sortOrder), asc(cliObjectives.id));

  return {
    id: mission.id,
    title: mission.title,
    briefing: mission.briefing,
    timeLimitSeconds: mission.timeLimitSeconds,
    objectives: objectives.map((o) => ({
      id: o.id,
      kind: o.kind,
      iface: o.iface,
      value: o.value,
      value2: o.value2,
      label: describeObjective(o),
    })),
  };
}
