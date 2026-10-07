"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, max } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db, cliMissions, cliObjectives, auditLogs } from "@/db";
import { requireRole } from "@/lib/guard";
import { uploadImage } from "@/lib/uploads"; // must match your upload file's real path
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

const ownedBy = (id: number, ownerId: number | null) =>
  and(
    eq(cliMissions.id, id),
    ownerId === null ? isNull(cliMissions.instructorId) : eq(cliMissions.instructorId, ownerId)
  );

/* Delete a Blob file; ignores anything that isn't one of ours. */
const dropBlob = async (url: string | null) => {
  if (url?.includes(".public.blob.vercel-storage.com")) await del(url).catch(() => {});
};

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

  const mission = await db.query.cliMissions.findFirst({ where: ownedBy(id, ownerId) });
  if (!mission) return;

  await db.delete(cliMissions).where(eq(cliMissions.id, mission.id)); // objectives cascade
  await dropBlob(mission.imagePath);
  revalidatePath(pathFor(scope));
}

export async function toggleMission(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1";
  if (!id) return;

  await db.update(cliMissions).set({ active }).where(ownedBy(id, ownerId));
  revalidatePath(pathFor(scope));
}

export async function addObjective(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);
  const missionId = Number(formData.get("missionId"));
  const kind = String(formData.get("kind")) as CliObjectiveKind;
  if (!missionId || !kind) return;

  /* Only add to a mission you own. */
  const mission = await db.query.cliMissions.findFirst({ where: ownedBy(missionId, ownerId) });
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
  const { ownerId } = await ownerFor(scope);
  const id = Number(formData.get("id"));
  if (!id) return;

  /* Only delete objectives that belong to a mission you own. */
  const [row] = await db
    .select({ id: cliObjectives.id })
    .from(cliObjectives)
    .innerJoin(cliMissions, eq(cliMissions.id, cliObjectives.missionId))
    .where(
      and(
        eq(cliObjectives.id, id),
        ownerId === null ? isNull(cliMissions.instructorId) : eq(cliMissions.instructorId, ownerId)
      )
    );
  if (!row) return;

  await db.delete(cliObjectives).where(eq(cliObjectives.id, row.id));
  revalidatePath(pathFor(scope));
}

/* ───────────── guide image ───────────── */

export async function setMissionImage(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);

  const mission = await db.query.cliMissions.findFirst({
    where: ownedBy(Number(formData.get("id")), ownerId),
  });
  if (!mission) return { error: "Mission not found, or it isn't yours." };

  const up = await uploadImage(formData);
  if (!up.url) return { error: up.error ?? "Upload failed." };

  await db.update(cliMissions).set({ imagePath: up.url }).where(eq(cliMissions.id, mission.id));
  await dropBlob(mission.imagePath);
  revalidatePath(pathFor(scope));
  return { ok: true };
}

export async function removeMissionImage(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const { ownerId } = await ownerFor(scope);

  const mission = await db.query.cliMissions.findFirst({
    where: ownedBy(Number(formData.get("id")), ownerId),
  });
  if (!mission) return;

  await db.update(cliMissions).set({ imagePath: null }).where(eq(cliMissions.id, mission.id));
  await dropBlob(mission.imagePath);
  revalidatePath(pathFor(scope));
}