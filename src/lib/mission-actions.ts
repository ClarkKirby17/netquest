"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, max } from "drizzle-orm";
import { db, cliMissions, cliObjectives, auditLogs } from "@/db";
import { requireRole } from "@/lib/guard";
import type { CliObjectiveKind, Difficulty } from "@/db/schema";

const pathFor = (scope: "mine" | "global") =>
  scope === "global" ? "/admin/missions" : "/instructor/missions";

async function ownerFor(scope: "mine" | "global") {
  const me =
    scope === "global"
      ? await requireRole("admin", "superadmin")
      : await requireRole("instructor");
  return { me, ownerId: scope === "global" ? null : me.userId };
}

export async function createMission(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { me, ownerId } = await ownerFor(scope);

  const title = String(formData.get("title") ?? "").trim();
  const briefing = String(formData.get("briefing") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "easy") as Difficulty;
  const timeLimitSeconds = Math.max(60, Math.min(1800, Number(formData.get("timeLimitSeconds") || 300)));
  if (title.length < 2) return;

  await db.insert(cliMissions).values({
    instructorId: ownerId, title, briefing, difficulty, timeLimitSeconds,
  });
  await db.insert(auditLogs).values({
    event: "cli.mission_created", userId: me.userId, userRole: me.role, details: title,
  });

  revalidatePath(pathFor(scope));
}

export async function deleteMission(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);
  const id = Number(formData.get("id"));
  if (!id) return;

  await db.delete(cliMissions).where(
    and(
      eq(cliMissions.id, id),
      ownerId === null ? isNull(cliMissions.instructorId) : eq(cliMissions.instructorId, ownerId)
    )
  );
  revalidatePath(pathFor(scope));
}

export async function toggleMission(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1";
  if (!id) return;

  await db.update(cliMissions).set({ active }).where(
    and(
      eq(cliMissions.id, id),
      ownerId === null ? isNull(cliMissions.instructorId) : eq(cliMissions.instructorId, ownerId)
    )
  );
  revalidatePath(pathFor(scope));
}

export async function addObjective(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);
  const missionId = Number(formData.get("missionId"));
  const kind = String(formData.get("kind")) as CliObjectiveKind;
  if (!missionId || !kind) return;

  /* Only add to a mission you own. */
  const mission = await db.query.cliMissions.findFirst({
    where: and(
      eq(cliMissions.id, missionId),
      ownerId === null ? isNull(cliMissions.instructorId) : eq(cliMissions.instructorId, ownerId)
    ),
  });
  if (!mission) return;

  const iface = String(formData.get("iface") ?? "").trim() || null;
  const value = String(formData.get("value") ?? "").trim() || null;
  const value2 = String(formData.get("value2") ?? "").trim() || null;

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(cliObjectives.sortOrder) })
    .from(cliObjectives)
    .where(eq(cliObjectives.missionId, missionId));

  await db.insert(cliObjectives).values({
    missionId, kind, iface, value, value2, sortOrder: (maxOrder ?? 0) + 1,
  });
  revalidatePath(pathFor(scope));
}

export async function deleteObjective(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  await ownerFor(scope);
  const id = Number(formData.get("id"));
  if (!id) return;
  await db.delete(cliObjectives).where(eq(cliObjectives.id, id));
  revalidatePath(pathFor(scope));
}
