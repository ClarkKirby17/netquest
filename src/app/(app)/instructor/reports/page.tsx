import { requireRole } from "@/lib/guard";
import ReportsView from "@/components/analytics/ReportsView";

export default async function InstructorReports() {
  await requireRole("instructor");
  return <ReportsView base="/instructor/reports" scoped />;
}
