import { requireRole } from "@/lib/guard";
import { analytics } from "@/lib/reports";
import { PageHead } from "@/components/ui";
import AnalyticsView from "@/components/analytics/AnalyticsView";

export default async function AdminAnalytics() {
  await requireRole("admin", "superadmin");
  const data = await analytics();

  return (
    <>
      <PageHead
        eyebrow="institution"
        title="Analytics"
        sub="Every section, every student, across the whole platform."
      />
      <AnalyticsView data={data} />
    </>
  );
}
