import { PageHead, Card } from "@/components/ui";
import { requireRole } from "@/lib/guard";
import { createModule } from "../../actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default async function NewModulePage() {
  await requireRole("admin", "superadmin");
  return (
    <>
      <PageHead eyebrow="curriculum" title="New module" sub="It starts as a draft. Publish it when the lessons are ready." />
      <Card className="max-w-xl p-6">
        <form action={createModule} className="space-y-4">
          <div>
            <label htmlFor="title" className={labelCx}>Module title</label>
            <input id="title" name="title" required minLength={2} placeholder="e.g. Protocols and Models" className={inputCx} />
          </div>
          <div>
            <label htmlFor="description" className={labelCx}>Description</label>
            <textarea id="description" name="description" rows={3} placeholder="One or two sentences students will see on the module card." className={inputCx} />
          </div>
          <button className="btn btn-primary">Create module</button>
        </form>
      </Card>
    </>
  );
}
