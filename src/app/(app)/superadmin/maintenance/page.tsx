import { and, count, eq, lt } from "drizzle-orm";
import { Database, Trash2 } from "lucide-react";
import {
  db, users, studentProfiles, modules, lessons, quizAttempts, gameScores,
  notifications, auditLogs, verificationCodes, passwordResets, cliMissions,
} from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, StatTile, Table, Th, Td } from "@/components/ui";
import { runPurge } from "../actions";

export default async function MaintenancePage() {
  await requireRole("superadmin");

  /* Sequential on purpose — see the note in lib/reports.ts. These are
     count(*) over small tables, so the total cost is a rounding error
     next to the risk of pipelining parameterised queries. */
  const now = new Date();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);

  const userCount = await one(db.select({ n: count() }).from(users));
  const attemptCount = await one(db.select({ n: count() }).from(quizAttempts));
  const runCount = await one(db.select({ n: count() }).from(gameScores));
  const auditCount = await one(db.select({ n: count() }).from(auditLogs));

  const studentCount = await one(db.select({ n: count() }).from(studentProfiles));
  const moduleCount = await one(db.select({ n: count() }).from(modules));
  const lessonCount = await one(db.select({ n: count() }).from(lessons));
  const missionCount = await one(db.select({ n: count() }).from(cliMissions));
  const notifCount = await one(db.select({ n: count() }).from(notifications));

  const staleCodes = await one(
    db.select({ n: count() }).from(verificationCodes).where(lt(verificationCodes.expiresAt, now))
  );
  const staleResets = await one(
    db.select({ n: count() }).from(passwordResets).where(lt(passwordResets.expiresAt, now))
  );
  const oldNotifs = await one(
    db.select({ n: count() }).from(notifications)
      .where(and(eq(notifications.isRead, true), lt(notifications.createdAt, daysAgo(30))))
  );
  const oldAudits = await one(
    db.select({ n: count() }).from(auditLogs).where(lt(auditLogs.createdAt, daysAgo(90)))
  );

  const tables = [
    ["users", userCount],
    ["student_profiles", studentCount],
    ["modules", moduleCount],
    ["lessons", lessonCount],
    ["quiz_attempts", attemptCount],
    ["game_scores", runCount],
    ["cli_missions", missionCount],
    ["notifications", notifCount],
    ["audit_logs", auditCount],
  ] as const;

  const purges = [
    { key: "codes", label: "Expired verification codes", eligible: staleCodes },
    { key: "resets", label: "Expired password-reset tokens", eligible: staleResets },
    { key: "notifications", label: "Read notifications older than 30 days", eligible: oldNotifs },
    { key: "audits", label: "Audit entries older than 90 days", eligible: oldAudits },
  ];

  return (
    <>
      <PageHead
        eyebrow="system"
        title="Database maintenance"
        sub="Row counts and safe cleanups. Nothing here touches learning progress or scores."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Database} label="Total users" value={userCount} />
        <StatTile icon={Database} label="Quiz attempts" value={attemptCount} tone="wire" />
        <StatTile icon={Database} label="Arcade runs" value={runCount} tone="warn" />
        <StatTile icon={Database} label="Audit entries" value={auditCount} tone="plain" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Table sizes" sub="Live row counts." />
          <Table>
            <thead><tr><Th>Table</Th><Th className="text-right">Rows</Th></tr></thead>
            <tbody>
              {tables.map(([name, rows]) => (
                <tr key={name}>
                  <Td>
                    <code className="font-[family-name:var(--font-mono-src)] text-sm text-[var(--color-muted)]">
                      {name}
                    </code>
                  </Td>
                  <Td className="text-right font-[family-name:var(--font-mono-src)]">{rows}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHead title="Housekeeping" sub="Each purge only removes expired or long-read rows." />
          <div className="divide-y divide-[var(--color-line)]">
            {purges.map((p) => (
              <div key={p.key} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {p.eligible} row{p.eligible === 1 ? "" : "s"} eligible
                  </div>
                </div>
                <form action={runPurge}>
                  <input type="hidden" name="key" value={p.key} />
                  <button
                    className="btn btn-ghost px-3 py-1.5 text-[.82rem] disabled:opacity-40"
                    disabled={p.eligible === 0}
                  >
                    <Trash2 size={14} /> Purge
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
