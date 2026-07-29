import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { Trophy } from "lucide-react";
import { db, studentProfiles, users, sections, gamification } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";
import { cn } from "@/lib/utils";

const SCOPES = [
  ["class", "My class"],
  ["section", "My section"],
  ["all", "Everyone"],
] as const;

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const me = await requireRole("student");
  const { scope: raw } = await searchParams;
  const scope = (["class", "section", "all"] as const).includes(raw as never)
    ? (raw as "class" | "section" | "all")
    : "class";

  const mine = await db.query.studentProfiles.findFirst({
    where: eq(studentProfiles.userId, me.userId),
  });

  const rows = await db
    .select({
      userId: studentProfiles.userId,
      name: users.fullName,
      section: sections.name,
      points: studentProfiles.totalPoints,
      badges: studentProfiles.badgeCount,
      instructorId: studentProfiles.instructorId,
      sectionId: studentProfiles.sectionId,
      level: gamification.level,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .leftJoin(gamification, eq(gamification.userId, studentProfiles.userId))
    .where(eq(users.status, "active"))
    .orderBy(desc(studentProfiles.totalPoints))
    .limit(200);

  const filtered = rows.filter((r) => {
    if (scope === "section") return r.sectionId === mine?.sectionId;
    if (scope === "class") return r.instructorId === mine?.instructorId;
    return true;
  });

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <>
      <PageHead
        eyebrow="standings"
        title="Leaderboard"
        sub="Points come from finishing modules, passing quizzes, and the arcade."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SCOPES.map(([key, label]) => (
          <Link
            key={key}
            href={`/student/leaderboard?scope=${key}`}
            className={cn("btn px-3.5 py-1.5 text-[.85rem]", scope === key ? "btn-primary" : "btn-ghost")}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHead
          title={scope === "class" ? "Your class" : scope === "section" ? "Your section" : "Everyone"}
          sub={`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
        />
        {filtered.length === 0 ? (
          <Empty icon={Trophy} title="Nobody here yet" body="Once your classmates start earning points they'll show up." />
        ) : (
          <Table>
            <thead>
              <tr><Th className="w-16">Rank</Th><Th>Student</Th><Th>Section</Th><Th>Level</Th><Th>Badges</Th><Th className="text-right">Points</Th></tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isMe = r.userId === me.userId;
                return (
                  <tr key={r.userId} className={isMe ? "bg-[var(--color-signal-soft)]" : undefined}>
                    <Td>
                      <span className="font-[family-name:var(--font-mono-src)] text-sm">
                        {medal[i] ?? `#${i + 1}`}
                      </span>
                    </Td>
                    <Td>
                      <span className={isMe ? "font-semibold text-[var(--color-signal)]" : "font-medium"}>
                        {r.name}
                      </span>
                      {isMe && <span className="ml-2"><Pill tone="signal">you</Pill></span>}
                    </Td>
                    <Td className="text-[var(--color-muted)]">{r.section}</Td>
                    <Td className="text-[var(--color-muted)]">Lv {r.level ?? 1}</Td>
                    <Td className="text-[var(--color-muted)]">{r.badges}</Td>
                    <Td className="text-right">
                      <span className="font-[family-name:var(--font-mono-src)] font-bold text-[var(--color-signal)]">
                        {r.points}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
