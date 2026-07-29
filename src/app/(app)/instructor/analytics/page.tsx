import { requireRole } from "@/lib/guard";
import { analytics } from "@/lib/reports";
import { PageHead } from "@/components/ui";
import AnalyticsView from "@/components/analytics/AnalyticsView";

export default async function InstructorAnalytics() {
  const me = await requireRole("instructor");
  const data = await analytics(me.userId);

  return (
    <>
      <PageHead
        eyebrow="your class"
        title="Analytics"
        sub="Everything below covers your own students only."
      />
      <AnalyticsView data={data} />
    </>
  );
}
