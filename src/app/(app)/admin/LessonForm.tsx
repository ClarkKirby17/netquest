import RichEditor from "@/components/editor/RichEditor";
import { saveLesson } from "./actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function LessonForm({
  moduleId,
  lesson }: {
  moduleId: number;
  lesson?: { id: number; title: string; contentHtml: string };
}) {
  return (
    <form action={saveLesson} className="space-y-4">
      <input type="hidden" name="moduleId" value={moduleId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}

      <div className="max-w-xl">
        <label htmlFor="title" className={labelCx}>Lesson title</label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          defaultValue={lesson?.title ?? ""}
          placeholder="e.g. Network Components"
          className={inputCx}
        />
      </div>

      <div>
        <label className={labelCx}>Content</label>
        <RichEditor name="contentHtml" initialHtml={lesson?.contentHtml ?? ""} />
      </div>

      <button className="btn btn-primary">{lesson ? "Save lesson" : "Create lesson"}</button>
    </form>
  );
}
