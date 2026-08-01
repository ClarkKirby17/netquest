import Link from "next/link";
import { and, count, eq, ilike, or } from "drizzle-orm";
import { Users, Search } from "lucide-react";
import { db, users, studentProfiles, sections, lessons, lessonProgress, modules } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Progress, Empty } from "@/components/ui";

export default async function StudentsPage({
  searchParams }: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireRole("instructor");
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const [{ n: totalLessons }] = await db
    .select({ n: count() })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(modules.isPublished, true));

  const roster = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      section: sections.name,
      points: studentProfiles.totalPoints })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .where(
      and(
        eq(studentProfiles.instructorId, me.userId),
        eq(users.status, "active"),
        q ? or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined
      )
    )
    .orderBy(users.fullName);

  const withProgress = await Promise.all(
    roster.map(async (s) => {
      const [{ n }] = await db
        .select({ n: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, s.id), eq(lessonProgress.completed, true)));
      return { ...s, done: Number(n), pct: totalLessons ? Math.round((Number(n) / Number(totalLessons)) * 100) : 0 };
    })
  );

  return (
    <>
      <PageHead eyebrow="your class" title="Students" sub="Active students assigned to you." />

      <Card className="mb-4 p-4">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="q" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Search your roster
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="name or email"
              className="w-full rounded-[8px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3 py-2 text-sm outline-none focus:border-[var(--color-signal)]"
            />
          </div>
          <button className="btn btn-primary px-4 py-2 text-sm"><Search size={14} /> Search</button>
          <Link href="/instructor/students" className="btn btn-ghost px-4 py-2 text-sm">Reset</Link>
        </form>
      </Card>
      <Card>
        <CardHead title="Roster" sub={`${withProgress.length} active`} />
        {withProgress.length === 0 ? (
          <Empty icon={Users} title="No active students yet" body="Approved students appear here." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Student</Th><Th>Section</Th><Th>Points</Th><Th>Lessons</Th><Th className="w-52">Progress</Th><Th className="text-right">Password</Th></tr>
            </thead>
            <tbody>
              {withProgress.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-[var(--color-muted)]">{s.email}</div>
                  </Td>
                  <Td className="text-[var(--color-muted)]">{s.section}</Td>
                  <Td><span className="font-[family-name:var(--font-mono-src)] text-[var(--color-signal)]">{s.points}</span></Td>
                  <Td className="text-[var(--color-muted)]">{s.done}/{Number(totalLessons)}</Td>
                  <Td><Progress value={s.pct} /></Td>
                  <Td className="text-right">
                    <ResetPasswordInline
                      action={resetStudentPassword}
                      idName="userId"
                      id={s.id}
                      name={s.name}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
