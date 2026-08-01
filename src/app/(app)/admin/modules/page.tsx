import Link from "next/link";
import { asc, eq, count } from "drizzle-orm";
import { Layers, Plus } from "lucide-react";
import { db, modules, lessons } from "@/db";
import { requireRole } from "@/lib/guard";
import { Card, CardHead, PageHead, Table, Th, Td, Pill, Empty } from "@/components/ui";

export default async function ModulesPage() {
  await requireRole("admin", "superadmin");

  const rows = await db
    .select({
      id: modules.id,
      n: modules.moduleNumber,
      title: modules.title,
      published: modules.isPublished,
      lessonCount: count(lessons.id) })
    .from(modules)
    .leftJoin(lessons, eq(lessons.moduleId, modules.id))
    .groupBy(modules.id)
    .orderBy(asc(modules.moduleNumber));

  return (
    <>
      <PageHead
        eyebrow="curriculum"
        title="Modules"
        sub="The shared curriculum every section follows."
        action={
          <Link href="/admin/modules/new" className="btn btn-primary">
            <Plus size={16} /> New module
          </Link>
        }
      />

      <Card>
        <CardHead title="All modules" sub="Students see them in this order." />
        {rows.length === 0 ? (
          <Empty
            icon={Layers}
            title="No modules yet"
            body="Create the first module and start adding lessons."
            action={<Link href="/admin/modules/new" className="btn btn-primary px-3 py-1.5 text-[.82rem]">New module</Link>}
          />
        ) : (
          <Table>
            <thead>
              <tr><Th className="w-14">#</Th><Th>Title</Th><Th>Lessons</Th><Th>Status</Th><Th className="text-right">Open</Th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <Td><span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">M{m.n}</span></Td>
                  <Td className="font-medium">{m.title}</Td>
                  <Td className="text-[var(--color-muted)]">{m.lessonCount}</Td>
                  <Td>
                    {m.published
                      ? <Pill tone="signal">live</Pill>
                      : <Pill>draft</Pill>}
                  </Td>
                  <Td className="text-right">
                    <Link href={`/admin/modules/${m.id}`} className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                      Manage
                    </Link>
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
