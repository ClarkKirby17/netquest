import { requireRole } from "@/lib/guard";
import { analytics } from "@/lib/reports";
import { PageHead } from "@/components/ui";
import AnalyticsView from "@/components/analytics/AnalyticsView";

export default async function SuperAdminAnalytics() {
  await requireRole("superadmin");
  const data = await analytics();

  return (
    <>
      <PageHead eyebrow="system" title="Analytics" sub="Platform-wide learning and engagement." />
      <AnalyticsView data={data} />
    </>
  );
}
