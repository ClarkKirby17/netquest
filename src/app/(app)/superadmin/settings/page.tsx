import { requireRole } from "@/lib/guard";
import { getAllSettings } from "@/lib/settings";
import { PageHead } from "@/components/ui";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  await requireRole("superadmin");
  const values = await getAllSettings();

  return (
    <>
      <PageHead
        eyebrow="system"
        title="Platform settings"
        sub="These change behaviour immediately — no deploy, no code edit."
      />
      <SettingsForm values={values} />
    </>
  );
}
