import { asc, eq, inArray } from "drizzle-orm";
import { db, users } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill } from "@/components/ui";
import { setUserStatus } from "../actions";

export default async function UsersPage() {
  await requireRole("admin", "superadmin");

  const rows = await db
    .select()
    .from(users)
    .where(inArray(users.role, ["student", "instructor"]))
    .orderBy(asc(users.role), asc(users.fullName));

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Users"
        sub="Students and instructors. Admin accounts are managed by the super admin."
      />
      <Card>
        <CardHead title="All accounts" sub={`${rows.length} users`} />
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th className="text-right">Action</Th></tr>
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
                  {u.status === "active" && <Pill tone="signal">active</Pill>}
                  {u.status === "pending" && <Pill tone="warn">pending</Pill>}
                  {u.status === "inactive" && <Pill tone="alert">inactive</Pill>}
                  {u.status === "rejected" && <Pill>rejected</Pill>}
                </Td>
                <Td className="text-right">
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
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
