import { asc, count, eq } from "drizzle-orm";
import { Layers } from "lucide-react";
import { db, courses, sections, studentProfiles, instructorProfiles } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";
import {
  createCourse, createSection, deleteSection, deleteCourse, renameCourse,
} from "../actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const smallInputCx =
  "w-full rounded-[8px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default async function CoursesPage() {
  await requireRole("admin", "superadmin");

  const courseRows = await db.select().from(courses).orderBy(asc(courses.name));

  /* Counts decide whether a course or section can safely be removed —
     deleting one people are enrolled in would orphan them. */
  /* Two grouped queries rather than two per course. The previous
     version issued 2N parallel statements, which both flooded the
     pool and risked crossed parameter bindings. */
  const sectionsByCourse = await db
    .select({ courseId: sections.courseId, n: count() })
    .from(sections)
    .groupBy(sections.courseId);
  const studentsByCourse = await db
    .select({ courseId: studentProfiles.courseId, n: count() })
    .from(studentProfiles)
    .groupBy(studentProfiles.courseId);

  const secMap = new Map(sectionsByCourse.map((r) => [r.courseId, Number(r.n)]));
  const stuMap = new Map(studentsByCourse.map((r) => [r.courseId, Number(r.n)]));

  const courseUsage = courseRows.map((c) => ({
    ...c,
    sectionCount: secMap.get(c.id) ?? 0,
    studentCount: stuMap.get(c.id) ?? 0,
  }));

  const sectionRows = await db
    .select({
      id: sections.id,
      name: sections.name,
      course: courses.name,
    })
    .from(sections)
    .innerJoin(courses, eq(courses.id, sections.courseId))
    .orderBy(asc(courses.name), asc(sections.name));

  const studentsBySection = await db
    .select({ sectionId: studentProfiles.sectionId, n: count() })
    .from(studentProfiles)
    .groupBy(studentProfiles.sectionId);
  const instructorsBySection = await db
    .select({ sectionId: instructorProfiles.sectionId, n: count() })
    .from(instructorProfiles)
    .groupBy(instructorProfiles.sectionId);

  const secStuMap = new Map(studentsBySection.map((r) => [r.sectionId, Number(r.n)]));
  const secInsMap = new Map(
    instructorsBySection.map((r) => [r.sectionId ?? 0, Number(r.n)])
  );

  const sectionUsage = sectionRows.map((s) => ({
    ...s,
    studentCount: secStuMap.get(s.id) ?? 0,
    instructorCount: secInsMap.get(s.id) ?? 0,
  }));

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Courses &amp; sections"
        sub="Every section belongs to exactly one course — registration filters on that."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHead
              title="Courses"
              sub="Delete is blocked while sections or students still reference one."
            />
            {courseUsage.length === 0 ? (
              <Empty icon={Layers} title="No courses yet" body="Add the first one below." />
            ) : (
              <Table>
                <thead>
                  <tr><Th>Course</Th><Th>Sections</Th><Th>Students</Th><Th className="text-right">Actions</Th></tr>
                </thead>
                <tbody>
                  {courseUsage.map((c) => {
                    const inUse = c.sectionCount > 0 || c.studentCount > 0;
                    return (
                      <tr key={c.id}>
                        <Td>
                          <form action={renameCourse} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={c.id} />
                            <input name="name" defaultValue={c.name} required minLength={2}
                              className={smallInputCx} aria-label="Course name" />
                            <input name="code" defaultValue={c.code ?? ""} placeholder="code"
                              className={smallInputCx + " w-20"} aria-label="Course code" />
                            <button className="btn btn-ghost px-2.5 py-1 text-[.75rem]">Save</button>
                          </form>
                        </Td>
                        <Td className="text-[var(--color-muted)]">{c.sectionCount}</Td>
                        <Td className="text-[var(--color-muted)]">{c.studentCount}</Td>
                        <Td className="text-right">
                          <form action={deleteCourse}>
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              disabled={inUse}
                              title={inUse ? "Remove its sections and students first" : "Delete " + c.name}
                              className="btn px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              Delete
                            </button>
                          </form>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-[.95rem] font-semibold">New course</h2>
            <form action={createCourse} className="space-y-3">
              <div>
                <label htmlFor="cname" className={labelCx}>Course name</label>
                <input id="cname" name="name" required minLength={2}
                  placeholder="BS Computer Engineering" className={inputCx} />
              </div>
              <div>
                <label htmlFor="ccode" className={labelCx}>Code (optional)</label>
                <input id="ccode" name="code" placeholder="BSCpE" className={inputCx} />
              </div>
              <button className="btn btn-primary">Add course</button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHead
              title="Sections"
              sub="Delete is blocked while an instructor or student is assigned."
            />
            {sectionUsage.length === 0 ? (
              <Empty icon={Layers} title="No sections yet" body="Create a course first, then add sections to it." />
            ) : (
              <Table>
                <thead>
                  <tr><Th>Section</Th><Th>Course</Th><Th>People</Th><Th className="text-right">Action</Th></tr>
                </thead>
                <tbody>
                  {sectionUsage.map((s) => {
                    const inUse = s.studentCount > 0 || s.instructorCount > 0;
                    return (
                      <tr key={s.id}>
                        <Td className="font-medium">{s.name}</Td>
                        <Td className="text-[var(--color-muted)]">{s.course}</Td>
                        <Td>
                          {inUse ? (
                            <span className="text-sm text-[var(--color-muted)]">
                              {s.studentCount} student{s.studentCount === 1 ? "" : "s"}
                              {s.instructorCount > 0 ? ", " + s.instructorCount + " instructor" : ""}
                            </span>
                          ) : (
                            <Pill>empty</Pill>
                          )}
                        </Td>
                        <Td className="text-right">
                          <form action={deleteSection}>
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              disabled={inUse}
                              title={inUse ? "Reassign its people first" : "Delete " + s.name}
                              className="btn px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              Delete
                            </button>
                          </form>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-[.95rem] font-semibold">New section</h2>
            <form action={createSection} className="space-y-3">
              <div>
                <label htmlFor="sname" className={labelCx}>Section name</label>
                <input id="sname" name="name" required placeholder="CS-2B" className={inputCx} />
              </div>
              <div>
                <label htmlFor="scourse" className={labelCx}>Belongs to course</label>
                <select id="scourse" name="courseId" required className={inputCx + " cursor-pointer"}>
                  <option value="">Choose a course</option>
                  {courseUsage.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.code ? " (" + c.code + ")" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" disabled={courseUsage.length === 0}>
                Add section
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
