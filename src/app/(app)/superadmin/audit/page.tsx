import Link from "next/link";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { ScrollText, Filter } from "lucide-react";
import { db, auditLogs, users } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";
import { cn } from "@/lib/utils";

const PER_PAGE = 25;

/* Colour the event by what it means, so scanning the log is fast. */
function toneFor(event: string): "signal" | "warn" | "alert" | "wire" | "muted" {
  if (event.includes("failed") || event.includes("denied") || event.includes("deleted") || event.includes("rejected"))
    return "alert";
  if (event.includes("approved") || event.includes("passed") || event.includes("created"))
    return "signal";
  if (event.includes("published") || event.includes("export") || event.includes("settings"))
    return "wire";
  if (event.includes("purge") || event.includes("reset")) return "warn";
  return "muted";
}

export default async function AuditPage({
  searchParams }: {
  searchParams: Promise<{ q?: string; role?: string; from?: string; to?: string; page?: string }>;
}) {
  await requireRole("superadmin");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const role = sp.role ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const conditions = [];
  if (q) {
    conditions.push(or(ilike(auditLogs.event, `%${q}%`), ilike(auditLogs.details, `%${q}%`)));
  }
  if (["student", "instructor", "admin", "superadmin"].includes(role)) {
    conditions.push(eq(auditLogs.userRole, role));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${from}T00:00:00`)));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    conditions.push(lte(auditLogs.createdAt, new Date(`${to}T23:59:59`)));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
  const pages = Math.max(1, Math.ceil(Number(total) / PER_PAGE));
  const current = Math.min(page, pages);

  const rows = await db
    .select({
      id: auditLogs.id,
      event: auditLogs.event,
      role: auditLogs.userRole,
      details: auditLogs.details,
      at: auditLogs.createdAt,
      actor: users.fullName })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(where)
    .orderBy(desc(auditLogs.id))
    .limit(PER_PAGE)
    .offset((current - 1) * PER_PAGE);

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (role) p.set("role", role);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    for (const [k, v] of Object.entries(over)) p.set(k, String(v));
    return `/superadmin/audit?${p.toString()}`;
  };

  const inputCx =
    "w-full rounded-[8px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3 py-2 text-sm outline-none focus:border-[var(--color-signal)]";

  return (
    <>
      <PageHead
        eyebrow="system"
        title="Audit log"
        sub="Every privileged action on the platform, oldest hidden behind the filters."
      />

      <Card className="mb-4 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Event or details
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="login, approved, export…" className={inputCx} />
          </div>
          <div>
            <label htmlFor="role" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Actor
            </label>
            <select id="role" name="role" defaultValue={role} className={inputCx + " cursor-pointer"}>
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              From
            </label>
            <input id="from" name="from" type="date" defaultValue={from} className={inputCx} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              To
            </label>
            <input id="to" name="to" type="date" defaultValue={to} className={inputCx} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <button className="btn btn-primary px-4 py-2 text-sm"><Filter size={14} /> Apply</button>
            <Link href="/superadmin/audit" className="btn btn-ghost px-4 py-2 text-sm">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHead title="Entries" sub={`${Number(total)} matching`} />
        {rows.length === 0 ? (
          <Empty icon={ScrollText} title="Nothing matches" body="Try widening the filters or clearing them." />
        ) : (
          <>
            <Table>
              <thead>
                <tr><Th className="w-40">When</Th><Th>Event</Th><Th>Actor</Th><Th>Details</Th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="whitespace-nowrap font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        {new Date(r.at).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </Td>
                    <Td><Pill tone={toneFor(r.event)}>{r.event}</Pill></Td>
                    <Td className="text-sm">
                      {r.actor ?? <span className="text-[var(--color-muted)]">—</span>}
                      {r.role && (
                        <span className="ml-2 font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-wider text-[var(--color-muted)]">
                          {r.role}
                        </span>
                      )}
                    </Td>
                    <Td className="max-w-xs truncate text-sm text-[var(--color-muted)]">
                      {r.details ?? "—"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {pages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-[var(--color-line)] p-4">
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pages || Math.abs(p - current) <= 2)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-1.5">
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="text-[var(--color-muted)]">…</span>
                      )}
                      <Link
                        href={qs({ page: p })}
                        className={cn(
                          "btn px-3 py-1 text-[.8rem]",
                          p === current ? "btn-primary" : "btn-ghost"
                        )}
                      >
                        {p}
                      </Link>
                    </span>
                  ))}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
