"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, count, eq, max, sql } from "drizzle-orm";
import {
  db, users, courses, sections, modules, lessons, notifications, auditLogs,
  instructorProfiles, studentProfiles,
} from "@/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireRole } from "@/lib/guard";

/* Admin and superadmin share these — superadmin inherits everything. */
const ADMIN = ["admin", "superadmin"] as const;

/* ────────────────────── instructor approvals ────────────────────── */

export async function approveInstructor(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("userId"));

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.role, "instructor"), eq(users.status, "pending")),
  });
  if (!target) return;

  await db.update(users).set({ status: "active" }).where(eq(users.id, id));
  await db.insert(notifications).values({
    userId: id,
    title: "Instructor account approved ✓",
    body: "You can now author modules and approve your students.",
    link: "/instructor",
  });
  await db.insert(auditLogs).values({
    event: "instructor.approved", userId: me.userId, userRole: me.role, details: target.email,
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

export async function rejectInstructor(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("userId"));

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.role, "instructor"), eq(users.status, "pending")),
  });
  if (!target) return;

  await db.delete(users).where(eq(users.id, id)); // frees the email
  await db.insert(auditLogs).values({
    event: "instructor.rejected", userId: me.userId, userRole: me.role, details: target.email,
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

/* ───────────────────────── module release ───────────────────────── */

export async function togglePublish(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  const publish = formData.get("publish") === "1";

  const target = await db.query.modules.findFirst({ where: eq(modules.id, id) });
  if (!target) return;

  await db.update(modules).set({ isPublished: publish }).where(eq(modules.id, id));
  await db.insert(auditLogs).values({
    event: publish ? "module.published" : "module.hidden",
    userId: me.userId,
    userRole: me.role,
    details: target.title,
  });

  revalidatePath("/admin/modules");
  revalidatePath("/admin");
}

/* ──────────────────────── courses & sections ─────────────────────── */

export async function createCourse(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  if (name.length < 2) return;

  await db.insert(courses).values({ name, code });
  await db.insert(auditLogs).values({
    event: "course.created", userId: me.userId, userRole: me.role, details: name,
  });
  revalidatePath("/admin/courses");
}

export async function createSection(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  const courseId = Number(formData.get("courseId"));
  if (name.length < 1 || !courseId) return;

  await db.insert(sections).values({ name, courseId });
  await db.insert(auditLogs).values({
    event: "section.created", userId: me.userId, userRole: me.role, details: name,
  });
  revalidatePath("/admin/courses");
}

export async function renameCourse(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim() || null;
  if (!id || name.length < 2) return;

  await db.update(courses).set({ name, code }).where(eq(courses.id, id));
  await db.insert(auditLogs).values({
    event: "course.renamed", userId: me.userId, userRole: me.role, details: name,
  });
  revalidatePath("/admin/courses");
}

/**
 * Delete a course. Refused while anything still points at it, because
 * cascading would silently take students' enrolments with it.
 */
export async function deleteCourse(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  if (!id) return;

  const target = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!target) return;

  const [{ sectionCount }] = await db
    .select({ sectionCount: count() })
    .from(sections)
    .where(eq(sections.courseId, id));
  if (Number(sectionCount) > 0) return;

  const [{ studentCount }] = await db
    .select({ studentCount: count() })
    .from(studentProfiles)
    .where(eq(studentProfiles.courseId, id));
  if (Number(studentCount) > 0) return;

  await db.delete(courses).where(eq(courses.id, id));
  await db.insert(auditLogs).values({
    event: "course.deleted", userId: me.userId, userRole: me.role, details: target.name,
  });
  revalidatePath("/admin/courses");
}

export async function deleteSection(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  if (!id) return;

  /* Guard: never orphan people. */
  const usedByInstructor = await db.query.instructorProfiles.findFirst({
    where: eq(instructorProfiles.sectionId, id),
  });
  if (usedByInstructor) return;

  const usedByStudent = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.sectionId, id),
  });
  if (usedByStudent) return;

  await db.delete(sections).where(eq(sections.id, id));
  await db.insert(auditLogs).values({
    event: "section.deleted", userId: me.userId, userRole: me.role, details: `section:${id}`,
  });
  revalidatePath("/admin/courses");
}

/**
 * Mark an account's email as verified without them receiving a code.
 *
 * Email delivery is the least reliable part of any signup flow —
 * provider limits, spam filters, typo'd addresses. Since every account
 * already needs a human to approve it, letting that same human confirm
 * the address removes a dead end without weakening anything.
 */
export async function verifyUserEmail(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  if (!id) return;

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target || target.emailVerifiedAt) return;
  /* Admins handle students and instructors; admin accounts are the
     superadmin's business. */
  if (target.role === "admin" || target.role === "superadmin") return;

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, id));
  await db.insert(auditLogs).values({
    event: "email.verified_manually",
    userId: me.userId,
    userRole: me.role,
    details: target.email,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/approvals");
}

/* ───────────────────────────── users ─────────────────────────────── */

export async function setUserStatus(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !["active", "inactive"].includes(status)) return;

  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!target) return;

  /* Admins can't touch admin/superadmin accounts — that's superadmin
     territory, coming in the superadmin phase. */
  if (target.role === "admin" || target.role === "superadmin") return;

  await db.update(users).set({ status: status as "active" | "inactive" }).where(eq(users.id, id));
  await db.insert(auditLogs).values({
    event: `user.${status}`, userId: me.userId, userRole: me.role, details: target.email,
  });
  revalidatePath("/admin/users");
}

/* ─────────────────────────── modules ─────────────────────────── */

export async function createModule(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (title.length < 2) return;

  const [{ maxNum }] = await db
    .select({ maxNum: max(modules.moduleNumber) })
    .from(modules);

  const [row] = await db
    .insert(modules)
    .values({
      moduleNumber: (maxNum ?? 0) + 1,
      title,
      description,
      authorId: me.userId,
      isPublished: false,
    })
    .returning({ id: modules.id });

  await db.insert(auditLogs).values({
    event: "module.created",
    userId: me.userId,
    userRole: me.role,
    details: title,
  });

  redirect(`/admin/modules/${row.id}`);
}

export async function updateModule(formData: FormData) {
  await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!id || title.length < 2) return;

  await db
    .update(modules)
    .set({ title, description, updatedAt: new Date() })
    .where(eq(modules.id, id));

  revalidatePath(`/admin/modules/${id}`);
  revalidatePath("/admin/modules");
}

export async function deleteModule(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  if (!id) return;

  const target = await db.query.modules.findFirst({ where: eq(modules.id, id) });
  if (!target) return;

  await db.delete(modules).where(eq(modules.id, id)); // lessons cascade

  /* Renumber so module_number stays a clean 1..n sequence. */
  const remaining = await db
    .select({ id: modules.id })
    .from(modules)
    .orderBy(asc(modules.moduleNumber), asc(modules.id));
  for (let i = 0; i < remaining.length; i++) {
    await db.update(modules).set({ moduleNumber: i + 1 }).where(eq(modules.id, remaining[i].id));
  }

  await db.insert(auditLogs).values({
    event: "module.deleted",
    userId: me.userId,
    userRole: me.role,
    details: target.title,
  });

  redirect("/admin/modules");
}

/* ─────────────────────────── lessons ─────────────────────────── */

export async function saveLesson(formData: FormData) {
  const me = await requireRole(...ADMIN);
  const lessonId = Number(formData.get("lessonId") || 0);
  const moduleId = Number(formData.get("moduleId"));
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = sanitizeHtml(String(formData.get("contentHtml") ?? ""));
  if (!moduleId || title.length < 2) return;

  if (lessonId) {
    await db
      .update(lessons)
      .set({ title, contentHtml })
      .where(eq(lessons.id, lessonId));
    await db.insert(auditLogs).values({
      event: "lesson.updated", userId: me.userId, userRole: me.role, details: title,
    });
  } else {
    const [{ maxOrder }] = await db
      .select({ maxOrder: max(lessons.lessonOrder) })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId));
    await db.insert(lessons).values({
      moduleId,
      lessonOrder: (maxOrder ?? 0) + 1,
      title,
      contentHtml,
    });
    await db.insert(auditLogs).values({
      event: "lesson.created", userId: me.userId, userRole: me.role, details: title,
    });
  }

  redirect(`/admin/modules/${moduleId}`);
}

export async function deleteLesson(formData: FormData) {
  await requireRole(...ADMIN);
  const id = Number(formData.get("id"));
  if (!id) return;

  const target = await db.query.lessons.findFirst({ where: eq(lessons.id, id) });
  if (!target) return;

  await db.delete(lessons).where(eq(lessons.id, id));
  /* close the gap in lesson_order */
  await db
    .update(lessons)
    .set({ lessonOrder: sql`${lessons.lessonOrder} - 1` })
    .where(
      and(eq(lessons.moduleId, target.moduleId), sql`${lessons.lessonOrder} > ${target.lessonOrder}`)
    );

  revalidatePath(`/admin/modules/${target.moduleId}`);
}
