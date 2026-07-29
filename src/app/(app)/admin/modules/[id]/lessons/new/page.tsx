import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, modules } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead, Card } from "@/components/ui";
import LessonForm from "../../../../LessonForm";

export default async function NewLessonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "superadmin");
  const { id } = await params;
  const moduleId = Number(id);
  if (!moduleId) notFound();

  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) });
  if (!mod) notFound();

  return (
    <>
      <PageHead
        eyebrow={`module ${mod.moduleNumber} · ${mod.title}`}
        title="New lesson"
        sub="Use the page-break button to split long lessons into reader pages."
      />
      <Card className="p-6">
        <LessonForm moduleId={mod.id} />
      </Card>
    </>
  );
}
