import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Plus, FileText } from "lucide-react";
import { db, modules, lessons } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Led, Empty } from "@/components/ui";
import { updateModule, deleteModule, deleteLesson, togglePublish } from "../../actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default async function ModuleDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "superadmin");
  const { id } = await params;
  const moduleId = Number(id);
  if (!moduleId) notFound();

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  if (!mod) notFound();

  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(asc(lessons.lessonOrder));

  return (
    <>
      <PageHead
        eyebrow={`module ${mod.moduleNumber}`}
        title={mod.title}
        sub={mod.isPublished ? "Live — every section can see this module." : "Draft — hidden from students until published."}
        action={
          <div className="flex gap-2">
            <form action={togglePublish}>
              <input type="hidden" name="id" value={mod.id} />
              <input type="hidden" name="publish" value={mod.isPublished ? "0" : "1"} />
              <button
                className={mod.isPublished ? "btn btn-ghost" : "btn btn-primary"}
                disabled={!mod.isPublished && rows.length === 0}
                title={!mod.isPublished && rows.length === 0 ? "Add a lesson first" : undefined}
              >
                {mod.isPublished ? "Unpublish" : "Publish"}
              </button>
            </form>
            <Link href={`/admin/modules/${mod.id}/lessons/new`} className="btn btn-primary">
              <Plus size={16} /> Add lesson
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHead title="Lessons" sub="Students read them in this order." />
          {rows.length === 0 ? (
            <Empty
              icon={FileText}
              title="No lessons yet"
              body="Add the first lesson — the editor supports headings, tables, images, and page breaks."
              action={
                <Link href={`/admin/modules/${mod.id}/lessons/new`} className="btn btn-primary px-3 py-1.5 text-[.82rem]">
                  Add lesson
                </Link>
              }
            />
          ) : (
            <Table>
              <thead>
                <tr><Th className="w-16">Code</Th><Th>Title</Th><Th className="text-right">Actions</Th></tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <Td>
                      <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        {mod.moduleNumber}.{l.lessonOrder}
                      </span>
                    </Td>
                    <Td className="font-medium">{l.title}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/lessons/${l.id}`} className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                          Edit
                        </Link>
                        <form action={deleteLesson}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="btn px-3 py-1.5 text-[.82rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
                            Delete
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

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[.95rem] font-semibold">Module details</h2>
              {mod.isPublished ? <Pill tone="signal"><Led state="done" />live</Pill> : <Pill>draft</Pill>}
            </div>
            <form action={updateModule} className="space-y-4">
              <input type="hidden" name="id" value={mod.id} />
              <div>
                <label htmlFor="title" className={labelCx}>Title</label>
                <input id="title" name="title" defaultValue={mod.title} required minLength={2} className={inputCx} />
              </div>
              <div>
                <label htmlFor="description" className={labelCx}>Description</label>
                <textarea id="description" name="description" rows={3} defaultValue={mod.description} className={inputCx} />
              </div>
              <button className="btn btn-primary">Save changes</button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="text-[.95rem] font-semibold text-[var(--color-alert)]">Danger zone</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Deletes this module and every lesson in it. Remaining modules are renumbered.
            </p>
            <form action={deleteModule} className="mt-4">
              <input type="hidden" name="id" value={mod.id} />
              <button className="btn border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
                Delete module
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
