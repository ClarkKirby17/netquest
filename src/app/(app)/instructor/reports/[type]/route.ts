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
  const me = await requireRole("instructor");
  const { type } = await params;
  const stamp = new Date().toISOString().slice(0, 10);

  await db.insert(auditLogs).values({
    event: "report.export", userId: me.userId, userRole: "instructor", details: type,
  });

  switch (type) {
    case "students":
      return csvResponse(
        `my-class-progress-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Status", "Course", "Section", "Professor", "Points", "Badges", "Level", "XP", "Streak", "Joined", "Lessons", "Modules"],
          await studentProgressReport(me.userId)
        )
      );
    case "quizzes":
      return csvResponse(
        `my-class-quizzes-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Section", "Module", "Attempts", "Best %", "Passed", "Last attempt"],
          await quizResultsReport(me.userId)
        )
      );
    case "arcade":
      return csvResponse(
        `my-class-arcade-${stamp}.csv`,
        toCsv(
          ["Name", "Email", "Game", "Runs", "Best score", "Points", "Last played"],
          await arcadeReport(me.userId)
        )
      );
    case "leaderboard":
      return csvResponse(
        `my-class-leaderboard-${stamp}.csv`,
        toCsv(
          ["Rank", "Name", "Email", "Course", "Section", "Points", "Badges", "Level"],
          await leaderboardReport(me.userId)
        )
      );
    default:
      return new Response("Unknown report", { status: 404 });
  }
}
