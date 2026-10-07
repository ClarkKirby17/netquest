import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getSetting } from "@/lib/settings";
import { db, courses, sections, instructorProfiles } from "@/db";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if ((await getSetting("registration_enabled")) === "0") {
    redirect("/login?closed=1");
  }


// inside RegisterPage:
const [courseRows, sectionRows, taken] = await Promise.all([
  db.select().from(courses).orderBy(asc(courses.name)),
  db.select().from(sections).orderBy(asc(sections.name)),
  db.select({ sectionId: instructorProfiles.sectionId }).from(instructorProfiles),
]);

return (
  <RegisterForm
    courses={courseRows.map((c) => ({ id: c.id, name: c.name }))}
    sections={sectionRows.map((s) => ({ id: s.id, name: s.name, courseId: s.courseId }))}
    instructorSectionIds={taken.map((t) => t.sectionId)}
  />
);
}