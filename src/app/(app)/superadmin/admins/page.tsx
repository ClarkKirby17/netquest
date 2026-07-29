import { and, asc, eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db, users } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";
import { setAdminStatus, deleteAdmin } from "../actions";
import CreateAdminForm from "./CreateAdminForm";
import ResetPasswordButton from "./ResetPasswordButton";

export default async function AdminsPage() {
  const me = await requireRole("superadmin");

  const admins = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.fullName));

  const activeCount = admins.filter((a) => a.status === "active").length;

  return (
    <>
      <PageHead
        eyebrow="system"
        title="Admin accounts"
        sub="Admins approve instructors, own the curriculum, and manage users. Only you can create them."
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHead title="Admins" sub={`${admins.length} account${admins.length === 1 ? "" : "s"} · ${activeCount} active`} />
          {admins.length === 0 ? (
            <Empty
              icon={ShieldCheck}
              title="No admin accounts"
              body="Create one using the form beside this panel."
            />
          ) : (
            <Table>
              <thead>
                <tr><Th>Name</Th><Th>Email</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const isLastActive = a.status === "active" && activeCount <= 1;
                  return (
                    <tr key={a.id}>
                      <Td className="font-medium">{a.fullName}</Td>
                      <Td className="text-[var(--color-muted)]">{a.email}</Td>
                      <Td>
                        {a.status === "active"
                          ? <Pill tone="signal">active</Pill>
                          : <Pill tone="alert">inactive</Pill>}
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <ResetPasswordButton id={a.id} name={a.fullName} />

                          <form action={setAdminStatus}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value={a.status === "active" ? "inactive" : "active"} />
                            <button
                              className="btn btn-ghost px-2.5 py-1 text-[.78rem] disabled:opacity-40"
                              disabled={isLastActive}
                              title={isLastActive ? "The last active admin can't be deactivated" : undefined}
                            >
                              {a.status === "active" ? "Deactivate" : "Reactivate"}
                            </button>
                          </form>

                          <form action={deleteAdmin}>
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              className="btn px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)] disabled:opacity-40"
                              disabled={isLastActive}
                              title={isLastActive ? "The last active admin can't be deleted" : undefined}
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="h-fit p-5">
          <h2 className="mb-1 text-[.95rem] font-semibold">New admin</h2>
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            The account is active immediately — no email verification, since you vouched for them.
          </p>
          <CreateAdminForm />
        </Card>
      </div>
    </>
  );
}
