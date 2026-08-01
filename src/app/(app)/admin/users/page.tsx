import Link from "next/link";
import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";
import { Search, Users as UsersIcon } from "lucide-react";
import { db, users } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";
import { setUserStatus, verifyUserEmail, resetUserPassword } from "../actions";
import ResetPasswordInline from "@/components/app/ResetPasswordInline";
import { cn } from "@/lib/utils";

const PER_PAGE = 20;

export default async function UsersPage({
  searchParams }: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  await requireRole("admin", "superadmin");
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const roleFilter = sp.role ?? "";
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  /* Filters compose: each one narrows the set further. */
  const conditions = [inArray(users.role, ["student", "instructor"] as const)];
  if (q) {
    conditions.push(or(ilike(users.fullName, `%${q}%`), ilike(users.email, `%${q}%`))!);
  }
  if (roleFilter === "student" || roleFilter === "instructor") {
    conditions.push(eq(users.role, roleFilter));
  }
  if (["active", "pending", "inactive"].includes(statusFilter)) {
    conditions.push(eq(users.status, statusFilter as "active" | "pending" | "inactive"));
  }
  const where = and(...conditions);

  const [totalRow] = await db.select({ n: count() }).from(users).where(where);
  const total = Number(totalRow?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(page, pages);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(asc(users.role), asc(users.fullName))
    .limit(PER_PAGE)
    .offset((current - 1) * PER_PAGE);

  const linkTo = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (roleFilter) p.set("role", roleFilter);
    if (statusFilter) p.set("status", statusFilter);
    for (const [k, v] of Object.entries(over)) p.set(k, String(v));
    return `/admin/users?${p.toString()}`;
  };

  const fieldCx =
    "w-full rounded-[8px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3 py-2 text-sm outline-none focus:border-[var(--color-signal)]";

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Users"
        sub="Students and instructors. Admin accounts are managed by the super admin."
      />

      <Card className="mb-4 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Search name or email
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="juan, @gmail.com…" className={fieldCx} />
          </div>
          <div>
            <label htmlFor="role" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Role
            </label>
            <select id="role" name="role" defaultValue={roleFilter} className={fieldCx + " cursor-pointer"}>
              <option value="">All</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.65rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              Status
            </label>
            <select id="status" name="status" defaultValue={statusFilter} className={fieldCx + " cursor-pointer"}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button className="btn btn-primary px-4 py-2 text-sm"><Search size={14} /> Search</button>
            <Link href="/admin/users" className="btn btn-ghost px-4 py-2 text-sm">Reset</Link>
          </div>
        </form>
      </Card>

      <Card>
        <CardHead title="All accounts" sub={`${total} matching`} />
        {rows.length === 0 ? (
          <Empty icon={UsersIcon} title="Nobody matches" body="Try widening the filters or clearing them." />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th><Th>Email</Th><Th>Role</Th>
                  <Th>Email verified</Th><Th>Status</Th><Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <Td className="font-medium">{u.fullName}</Td>
                    <Td className="text-[var(--color-muted)]">{u.email}</Td>
                    <Td>
                      <span className="font-[family-name:var(--font-mono-src)] text-xs uppercase tracking-wider text-[var(--color-muted)]">
                        {u.role}
                      </span>
                    </Td>
                    <Td>
                      {u.emailVerifiedAt ? (
                        <Pill tone="signal">verified</Pill>
                      ) : (
                        <form action={verifyUserEmail}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            className="btn btn-ghost px-2.5 py-1 text-[.75rem]"
                            title="Confirm this address yourself if the code never arrived"
                          >
                            Verify manually
                          </button>
                        </form>
                      )}
                    </Td>
                    <Td>
                      {u.status === "active" && <Pill tone="signal">active</Pill>}
                      {u.status === "pending" && <Pill tone="warn">pending</Pill>}
                      {u.status === "inactive" && <Pill tone="alert">inactive</Pill>}
                      {u.status === "rejected" && <Pill>rejected</Pill>}
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <ResetPasswordInline
                          action={resetUserPassword}
                          idName="id"
                          id={u.id}
                          name={u.fullName}
                        />
                      {u.status === "active" && (
                        <form action={setUserStatus}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="inactive" />
                          <button className="btn btn-ghost px-3 py-1.5 text-[.82rem]">Deactivate</button>
                        </form>
                      )}
                      {u.status === "inactive" && (
                        <form action={setUserStatus}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value="active" />
                          <button className="btn btn-primary px-3 py-1.5 text-[.82rem]">Reactivate</button>
                        </form>
                      )}
                      </div>
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
                        href={linkTo({ page: p })}
                        className={cn("btn px-3 py-1 text-[.8rem]", p === current ? "btn-primary" : "btn-ghost")}
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
