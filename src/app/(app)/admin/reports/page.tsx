import { requireRole } from "@/lib/guard";
import ReportsView from "@/components/analytics/ReportsView";

export default async function AdminReports() {
  await requireRole("admin", "superadmin");
  return <ReportsView base="/admin/reports" scoped={false} />;
}
