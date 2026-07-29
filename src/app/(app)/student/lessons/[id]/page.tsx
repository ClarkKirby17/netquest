import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guard";
import { readerContext } from "@/lib/learning";
import Reader from "./Reader";

export default async function LessonReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("student");
  const { id } = await params;
  const lessonId = Number(id);
  if (!lessonId) notFound();

  /* readerContext returns null when this student may not open it —
     the lock is enforced here, not in the browser. */
  const ctx = await readerContext(me.userId, lessonId);
  if (!ctx) notFound();

  return (
    <Reader
      lessonId={ctx.lesson.id}
      moduleId={ctx.module.id}
      moduleNumber={ctx.module.moduleNumber}
      moduleTitle={ctx.module.title}
      title={ctx.lesson.title}
      pages={ctx.pages}
      startPage={ctx.furthestPage}
      completed={ctx.completed}
      nextLessonId={ctx.next?.id ?? null}
      position={ctx.position}
    />
  );
}
