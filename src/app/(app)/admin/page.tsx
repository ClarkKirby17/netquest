import Link from "next/link";
import { and, asc, count, eq } from "drizzle-orm";
import { UserCheck, Users, Presentation, BookOpen, ArrowRight } from "lucide-react";
import { db, users, modules, lessons } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, StatTile, Pill, Led, Table, Th, Td } from "@/components/ui";

export default async function AdminDashboard() {
  await requireRole("admin", "superadmin");

  /* Sequential: pipelining parameterised queries over the pooled
     connection crossed parameter bindings. These are trivial counts. */
  const [pendingInstructors] = await db.select({ n: count() }).from(users)
    .where(and(eq(users.role, "instructor"), eq(users.status, "pending")));
  const [students] = await db.select({ n: count() }).from(users)
    .where(and(eq(users.role, "student"), eq(users.status, "active")));
  const [instructors] = await db.select({ n: count() }).from(users)
    .where(and(eq(users.role, "instructor"), eq(users.status, "active")));
  const [published] = await db.select({ n: count() }).from(modules)
    .where(eq(modules.isPublished, true));
  const [total] = await db.select({ n: count() }).from(modules);

  const moduleRows = await db
    .select({
      id: modules.id,
      n: modules.moduleNumber,
      title: modules.title,
      published: modules.isPublished,
      lessonCount: count(lessons.id),
    })
    .from(modules)
    .leftJoin(lessons, eq(lessons.moduleId, modules.id))
    .groupBy(modules.id)
    .orderBy(asc(modules.moduleNumber))
    .limit(6);

  const pendingN = Number(pendingInstructors?.n ?? 0);

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Admin dashboard"
        sub="Approvals, accounts, courses, and what students can see."
        action={
          pendingN > 0 ? (
            <Link href="/admin/approvals" className="btn btn-primary">
              {pendingN} waiting <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={UserCheck} label="Pending instructors" value={pendingN} tone={pendingN ? "warn" : "plain"} />
        <StatTile icon={Users} label="Active students" value={Number(students?.n ?? 0)} />
        <StatTile icon={Presentation} label="Instructors" value={Number(instructors?.n ?? 0)} tone="wire" />
        <StatTile icon={BookOpen} label="Live modules" value={`${Number(published?.n ?? 0)}/${Number(total?.n ?? 0)}`} tone="wire" />
      </div>

      <Card className="mt-4">
        <CardHead
          title="Curriculum"
          sub="The shared modules every section follows."
          action={<Link href="/admin/modules" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">Manage</Link>}
        />
        <Table>
          <thead>
            <tr><Th className="w-14">#</Th><Th>Module</Th><Th>Lessons</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {moduleRows.map((m) => (
              <tr key={m.id}>
                <Td><span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">M{m.n}</span></Td>
                <Td className="font-medium">{m.title}</Td>
                <Td className="text-[var(--color-muted)]">{Number(m.lessonCount)}</Td>
                <Td>
                  {m.published
                    ? <Pill tone="signal"><Led state="done" />live</Pill>
                    : <Pill>hidden</Pill>}
                </Td>
              </tr>
            ))}
            {moduleRows.length === 0 && (
              <tr><Td className="text-[var(--color-muted)]">No modules authored yet.</Td><Td /><Td /><Td /></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
