"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db, doorQuestions, auditLogs } from "@/db";
import { requireRole } from "@/lib/guard";

/* Arcade questions layer: admin owns the global pool (instructorId
   null); each professor adds their own on top. Students see both. */

export async function saveDoorQuestion(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const me =
    scope === "global"
      ? await requireRole("admin", "superadmin")
      : await requireRole("instructor");
  const ownerId = scope === "global" ? null : me.userId;

  const id = Number(formData.get("id") || 0);
  const question = String(formData.get("question") ?? "").trim();
  const optionA = String(formData.get("optionA") ?? "").trim();
  const optionB = String(formData.get("optionB") ?? "").trim();
  const optionC = String(formData.get("optionC") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "easy") as "easy" | "medium" | "hard";
  let correctOption = String(formData.get("correctOption") ?? "A").toUpperCase().slice(0, 1);
  if (!["A", "B", "C"].includes(correctOption)) correctOption = "A";

  if (question.length < 4 || !optionA || !optionB || !optionC) return;

  if (id) {
    /* Only touch rows you own. */
    await db
      .update(doorQuestions)
      .set({ question, optionA, optionB, optionC, correctOption, explanation, difficulty })
      .where(
        and(
          eq(doorQuestions.id, id),
          ownerId === null
            ? isNull(doorQuestions.instructorId)
            : eq(doorQuestions.instructorId, ownerId)
        )
      );
  } else {
    await db.insert(doorQuestions).values({
      instructorId: ownerId,
      question, optionA, optionB, optionC, correctOption, explanation, difficulty,
    });
    await db.insert(auditLogs).values({
      event: "arcade.question_added", userId: me.userId, userRole: me.role, details: difficulty,
    });
  }

  revalidatePath(scope === "global" ? "/admin/questions" : "/instructor/questions");
}

export async function deleteDoorQuestion(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const me =
    scope === "global"
      ? await requireRole("admin", "superadmin")
      : await requireRole("instructor");
  const ownerId = scope === "global" ? null : me.userId;
  const id = Number(formData.get("id"));
  if (!id) return;

  await db
    .delete(doorQuestions)
    .where(
      and(
        eq(doorQuestions.id, id),
        ownerId === null
          ? isNull(doorQuestions.instructorId)
          : eq(doorQuestions.instructorId, ownerId)
      )
    );

  revalidatePath(scope === "global" ? "/admin/questions" : "/instructor/questions");
}

export async function toggleDoorQuestion(formData: FormData) {
  const scope = (formData.get("scope") as "mine" | "global") ?? "mine";
  const me =
    scope === "global"
      ? await requireRole("admin", "superadmin")
      : await requireRole("instructor");
  const ownerId = scope === "global" ? null : me.userId;
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1";
  if (!id) return;

  await db
    .update(doorQuestions)
    .set({ active })
    .where(
      and(
        eq(doorQuestions.id, id),
        ownerId === null
          ? isNull(doorQuestions.instructorId)
          : eq(doorQuestions.instructorId, ownerId)
      )
    );

  revalidatePath(scope === "global" ? "/admin/questions" : "/instructor/questions");
}
