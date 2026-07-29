"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import {
  db, users, studentProfiles, notifications, auditLogs, gamification,
} from "@/db";
import { requireRole } from "@/lib/guard";

/* ─────────────────────────── approvals ───────────────────────────
   Scoped hard to the signed-in instructor: the WHERE clause carries
   their id, so instructor A can never act on instructor B's student. */

export async function approveStudent(formData: FormData) {
  const me = await requireRole("instructor");
  const studentId = Number(formData.get("userId"));

  const profile = await db.query.studentProfiles.findFirst({
    where: and(
      eq(studentProfiles.userId, studentId),
      eq(studentProfiles.instructorId, me.userId)
    ),
  });
  if (!profile) return;

  await db
    .update(users)
    .set({ status: "active" })
    .where(and(eq(users.id, studentId), eq(users.status, "pending")));

  await db.insert(gamification).values({ userId: studentId }).onConflictDoNothing();
  await db.insert(notifications).values({
    userId: studentId,
    title: "Welcome to NetQuest 🎉",
    body: "Your account was approved. Module 1 is waiting for you.",
    link: "/student/modules",
  });
  await db.insert(auditLogs).values({
    event: "student.approved",
    userId: me.userId,
    userRole: "instructor",
    details: `student:${studentId}`,
  });

  revalidatePath("/instructor/approvals");
  revalidatePath("/instructor");
}

export async function rejectStudent(formData: FormData) {
  const me = await requireRole("instructor");
  const studentId = Number(formData.get("userId"));

  const target = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(users.id, studentId),
        eq(users.status, "pending"),
        eq(studentProfiles.instructorId, me.userId)
      )
    );
  if (target.length === 0) return;

  /* v1 lesson: deleting the row frees the email so they can register
     again; the audit entry keeps the record of the rejection. */
  await db.delete(users).where(eq(users.id, studentId));
  await db.insert(auditLogs).values({
    event: "student.rejected",
    userId: me.userId,
    userRole: "instructor",
    details: target[0].email,
  });

  revalidatePath("/instructor/approvals");
  revalidatePath("/instructor");
}
