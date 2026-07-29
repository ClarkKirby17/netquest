import { requireRole } from "@/lib/guard";
import {
  studentProgressReport, quizResultsReport, arcadeReport, leaderboardReport,
  toCsv, csvResponse,
} from "@/lib/reports";
import { db, auditLogs } from "@/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const me = await requireRole("admin", "superadmin");
  const { type } = await params;
  const stamp = new Date().toISOString().slice(0, 10);

  await db.insert(auditLogs).values({
    event: "report.export", userId: me.userId, userRole: me.role, details: type,
  });

  switch (type) {
    case "students":
      return csvResponse(
        `netquest-students-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Status", "Course", "Section", "Professor", "Points", "Badges", "Level", "XP", "Streak", "Joined", "Lessons", "Modules"],
          await studentProgressReport()
        )
      );
    case "quizzes":
      return csvResponse(
        `netquest-quizzes-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Section", "Module", "Attempts", "Best %", "Passed", "Last attempt"],
          await quizResultsReport()
        )
      );
    case "arcade":
      return csvResponse(
        `netquest-arcade-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Game", "Runs", "Best score", "Points", "Last played"],
          await arcadeReport()
        )
      );
    case "leaderboard":
      return csvResponse(
        `netquest-leaderboard-${stamp}.csv`,
        toCsv(
          ["Rank", "Name", "Email", "Course", "Section", "Points", "Badges", "Level"],
          await leaderboardReport()
        )
      );
    default:
      return new Response("Unknown report", { status: 404 });
  }
}
