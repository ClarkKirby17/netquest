import { and, eq } from "drizzle-orm";
import { UserCheck } from "lucide-react";
import { db, users, studentProfiles, courses, sections } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Empty, Pill } from "@/components/ui";
import { approveStudent, rejectStudent, verifyStudentEmail } from "../actions";

export default async function ApprovalsPage() {
  const me = await requireRole("instructor");

  const rows = await db
    .select({
      id: users.id,
      name: users.fullName,
      email: users.email,
      verified: users.emailVerifiedAt,
      course: courses.name,
      section: sections.name,
      at: users.createdAt })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .innerJoin(courses, eq(courses.id, studentProfiles.courseId))
    .innerJoin(sections, eq(sections.id, studentProfiles.sectionId))
    .where(and(eq(users.status, "pending"), eq(studentProfiles.instructorId, me.userId)))
    .orderBy(users.createdAt);

  return (
    <>
      <PageHead
        eyebrow="your class"
        title="Student approvals"
        sub="Registrations assigned to you. Rejecting frees the email so they can register again."
      />

      <Card>
        <CardHead title="Waiting" sub={`${rows.length} pending`} />
        {rows.length === 0 ? (
          <Empty
            icon={UserCheck}
            title="Queue is clear"
            body="New registrations that pick you as instructor will appear here."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th><Th>Email</Th><Th>Course · Section</Th><Th>Verified</Th><Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-[var(--color-muted)]">{r.email}</Td>
                  <Td className="text-[var(--color-muted)]">{r.course} · {r.section}</Td>
                  <Td>
                    {r.verified ? (
                      <Pill tone="signal">verified</Pill>
                    ) : (
                      <form action={verifyStudentEmail}>
                        <input type="hidden" name="userId" value={r.id} />
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
                      <form action={approveStudent}>
                        <input type="hidden" name="userId" value={r.id} />
                        <button className="btn btn-primary px-3 py-1.5 text-[.82rem]">Approve</button>
                      </form>
                      <form action={rejectStudent}>
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
