import { and, eq } from "drizzle-orm";
import { UserCheck } from "lucide-react";
import { db, users, instructorProfiles, courses, sections } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Empty, Pill } from "@/components/ui";
import { approveInstructor, rejectInstructor, verifyUserEmail } from "../actions";

export default async function AdminApprovalsPage() {
  await requireRole("admin", "superadmin");

  const rows = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      verified: users.emailVerifiedAt,
      course: courses.name,
      section: sections.name })
    .from(users)
    .innerJoin(instructorProfiles, eq(instructorProfiles.userId, users.id))
    .leftJoin(courses, eq(courses.id, instructorProfiles.courseId))
    .leftJoin(sections, eq(sections.id, instructorProfiles.sectionId))
    .where(and(eq(users.role, "instructor"), eq(users.status, "pending")))
    .orderBy(users.createdAt);

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Instructor approvals"
        sub="Instructor applications. Rejecting frees the email for another try."
      />
      <Card>
        <CardHead title="Waiting" sub={`${rows.length} pending`} />
        {rows.length === 0 ? (
          <Empty icon={UserCheck} title="Queue is clear" body="New instructor applications will appear here." />
        ) : (
          <Table>
            <thead>
              <tr><Th>Instructor</Th><Th>Email</Th><Th>Course · Section</Th><Th>Verified</Th><Th className="text-right">Action</Th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-[var(--color-muted)]">{r.email}</Td>
                  <Td className="text-[var(--color-muted)]">{r.course ?? "—"} · {r.section ?? "—"}</Td>
                  <Td>
                    {r.verified ? (
                      <Pill tone="signal">verified</Pill>
                    ) : (
                      <form action={verifyUserEmail}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          className="btn btn-ghost px-2.5 py-1 text-[.75rem]"
                          title="Confirm this address yourself if the code never arrived"
                        >
                          Verify manually
                        </button>
                      </form>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <form action={approveInstructor}>
                        <input type="hidden" name="userId" value={r.id} />
                        <button className="btn btn-primary px-3 py-1.5 text-[.82rem]">Approve</button>
                      </form>
                      <form action={rejectInstructor}>
                        <input type="hidden" name="userId" value={r.id} />
                        <button className="btn px-3 py-1.5 text-[.82rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
                          Reject
                        </button>
                      </form>
                    </div>
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
