import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getSetting } from "@/lib/settings";
import { db, courses, sections, users, instructorProfiles } from "@/db";
import RegisterForm from "./RegisterForm";

/* Courses and sections come from the database and change while the app
   is running, so this page must never be prerendered at build time. */
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  /* Superadmin can close registration platform-wide. */
  if ((await getSetting("registration_enabled")) === "0") {
    redirect("/login?closed=1");
  }

  const [courseRows, sectionRows, instructorRows] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.name)),
    db.select().from(sections).orderBy(asc(sections.name)),
    db
      .select({
        id: users.id,
        name: users.fullName,
        sectionId: instructorProfiles.sectionId,
      })
      .from(users)
      .innerJoin(instructorProfiles, eq(instructorProfiles.userId, users.id))
      .where(eq(users.status, "active"))
      .orderBy(asc(users.fullName)),
  ]);

  return (
    <RegisterForm
      courses={courseRows.map((c) => ({ id: c.id, name: c.name }))}
      sections={sectionRows.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId }))}
      instructors={instructorRows.map((i) => ({
        id: i.id,
        name: i.name,
        sectionId: i.sectionId ?? 0,
      }))}
    />
  );
}
