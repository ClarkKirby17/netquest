import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { UserCheck, Users, BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { and as andOp, isNull } from "drizzle-orm";
import { db, users, studentProfiles, modules, sections, quizzes } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, StatTile, Table, Th, Td } from "@/components/ui";

export default async function InstructorDashboard() {
  const me = await requireRole("instructor");

  /* Sequential — see the note in lib/reports.ts. */
  const [pending] = await db.select({ n: count() }).from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(and(eq(users.status, "pending"), eq(studentProfiles.instructorId, me.userId)));
  const [active] = await db.select({ n: count() }).from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(and(eq(users.status, "active"), eq(studentProfiles.instructorId, me.userId)));
  const [published] = await db.select({ n: count() }).from(modules)
    .where(eq(modules.isPublished, true));
  const [myQuizzes] = await db.select({ n: count() }).from(quizzes)
    .where(and(eq(quizzes.instructorId, me.userId), eq(quizzes.isPublished, true)));

  const roster = await db
    .select({
      id: users.id,
      name: users.fullName,
      section: sections.name,
      points: studentProfiles.totalPoints,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .where(and(eq(studentProfiles.instructorId, me.userId), eq(users.status, "active")))
    .orderBy(studentProfiles.totalPoints)
    .limit(5);

  const pendingN = Number(pending?.n ?? 0);

  return (
    <>
      <PageHead
        eyebrow="your class"
        title={`Welcome, ${me.name.split(" ")[0]}`}
        sub="Approve students, author modules, and watch where the class stalls."
        action={
          pendingN > 0 ? (
            <Link href="/instructor/approvals" className="btn btn-primary">
              {pendingN} waiting <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={UserCheck} label="Pending approvals" value={pendingN} tone={pendingN ? "warn" : "plain"} />
        <StatTile icon={Users} label="Active students" value={Number(active?.n ?? 0)} />
        <StatTile icon={BookOpen} label="Live modules" value={Number(published?.n ?? 0)} tone="wire" />
        <StatTile icon={GraduationCap} label="My live quizzes" value={Number(myQuizzes?.n ?? 0)} tone="plain" />
      </div>

      {Number(published?.n ?? 0) > Number(myQuizzes?.n ?? 0) && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--color-warn)]">
                {Number(published?.n ?? 0) - Number(myQuizzes?.n ?? 0)} module
                {Number(published?.n ?? 0) - Number(myQuizzes?.n ?? 0) === 1 ? "" : "s"} without your own quiz
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                Your students take the admin&apos;s default quiz there. Write your own to replace it.
              </p>
            </div>
            <Link href="/instructor/quizzes" className="btn btn-ghost">Review quizzes</Link>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHead
          title="Your students"
          action={<Link href="/instructor/students" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">Full roster</Link>}
        />
        <Table>
          <thead>
            <tr><Th>Student</Th><Th>Section</Th><Th className="text-right">Points</Th></tr>
          </thead>
          <tbody>
            {roster.map((s) => (
              <tr key={s.id}>
                <Td className="font-medium">{s.name}</Td>
                <Td className="text-[var(--color-muted)]">{s.section}</Td>
                <Td className="text-right">
                  <span className="font-[family-name:var(--font-mono-src)] text-[var(--color-signal)]">{s.points}</span>
                </Td>
              </tr>
            ))}
            {roster.length === 0 && (
              <tr><Td className="text-[var(--color-muted)]">No active students yet — approvals land here.</Td><Td /><Td /></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
