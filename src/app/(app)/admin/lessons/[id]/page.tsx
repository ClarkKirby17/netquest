import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, lessons, modules } from "@/db";
import { requireRole } from "@/lib/guard";
import { PageHead, Card } from "@/components/ui";
import LessonForm from "../../LessonForm";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "superadmin");
  const { id } = await params;
  const lessonId = Number(id);
  if (!lessonId) notFound();

  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) });
  if (!lesson) notFound();
  const mod = await db.query.modules.findFirst({ where: eq(modules.id, lesson.moduleId) });

  return (
    <>
      <PageHead
        eyebrow={mod ? `module ${mod.moduleNumber} · ${mod.title}` : "lesson"}
        title={`Edit: ${lesson.title}`}
      />
      <Card className="p-6">
        <LessonForm
          moduleId={lesson.moduleId}
          lesson={{ id: lesson.id, title: lesson.title, contentHtml: lesson.contentHtml }}
        />
      </Card>
    </>
  );
}
