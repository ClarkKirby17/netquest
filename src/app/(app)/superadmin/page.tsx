import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { ShieldCheck, Users, Database, ArrowRight, ScrollText } from "lucide-react";
import { db, users, auditLogs, modules } from "@/db";
import { requireRole } from "@/lib/guard";
import { getAllSettings } from "@/lib/settings";
import { Card, CardHead, PageHead, StatTile, Pill, Empty } from "@/components/ui";

export default async function SuperAdminDashboard() {
  await requireRole("superadmin");

  /* Sequential — see the note in lib/reports.ts. */
  const [admins] = await db.select({ n: count() }).from(users)
    .where(and(eq(users.role, "admin"), eq(users.status, "active")));
  const [allUsers] = await db.select({ n: count() }).from(users);
  const [published] = await db.select({ n: count() }).from(modules)
    .where(eq(modules.isPublished, true));
  const settings = await getAllSettings();

  const recent = await db
    .select({
      id: auditLogs.id,
      event: auditLogs.event,
      role: auditLogs.userRole,
      details: auditLogs.details,
      at: auditLogs.createdAt })
    .from(auditLogs)
    .orderBy(desc(auditLogs.id))
    .limit(8);

  const registrationOpen = settings.registration_enabled === "1";

  return (
    <>
      <PageHead
        eyebrow="system"
        title="Super admin"
        sub="Accounts, audit trail, settings, and database health."
        action={
          <Link href="/superadmin/admins" className="btn btn-primary">
            Manage admins <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={ShieldCheck} label="Active admins" value={Number(admins?.n ?? 0)} />
        <StatTile icon={Users} label="Total users" value={Number(allUsers?.n ?? 0)} tone="wire" />
        <StatTile icon={Database} label="Live modules" value={Number(published?.n ?? 0)} tone="plain" />
        <StatTile
          icon={ShieldCheck}
          label="Registration"
          value={registrationOpen ? "Open" : "Closed"}
          tone={registrationOpen ? "signal" : "warn"}
        />
      </div>

      {settings.announcement && (
        <Card className="mt-4 p-5">
          <div className="flex items-start gap-3">
            <Pill tone="warn">announcement live</Pill>
            <p className="min-w-0 flex-1 text-sm text-[var(--color-muted)]">
              &ldquo;{settings.announcement}&rdquo;
            </p>
            <Link href="/superadmin/settings" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
              Edit
            </Link>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHead
          title="Recent activity"
          sub="Every privileged action is recorded."
          action={
            <Link href="/superadmin/audit" className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
              Full log
            </Link>
          }
        />
        {recent.length === 0 ? (
          <Empty icon={ScrollText} title="Nothing logged yet" body="Actions appear here as people use the platform." />
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {recent.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                  {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Pill>{r.event}</Pill>
                <span className="ml-auto truncate text-sm text-[var(--color-muted)]">
                  {r.details ?? r.role ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
