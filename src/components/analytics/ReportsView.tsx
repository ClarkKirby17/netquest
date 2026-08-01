import { Users, GraduationCap, Gamepad2, Trophy, Download } from "lucide-react";
import { Card, PageHead } from "@/components/ui";

const REPORTS = [
  {
    key: "students",
    name: "Student progress",
    icon: Users,
    desc: "One row per student: course, section, points, badges, level, XP, streak, and modules and lessons completed." },
  {
    key: "quizzes",
    name: "Quiz results",
    icon: GraduationCap,
    desc: "One row per student per quiz: attempts used, best percentage, pass status, and the latest attempt." },
  {
    key: "arcade",
    name: "Arcade activity",
    icon: Gamepad2,
    desc: "Runs, best score, and points earned per student per game." },
  {
    key: "leaderboard",
    name: "Leaderboard snapshot",
    icon: Trophy,
    desc: "The current ranking by total points, with badges and levels — ready to print or share." },
];

export default function ReportsView({ base, scoped }: { base: string; scoped: boolean }) {
  return (
    <>
      <PageHead
        eyebrow="reports"
        title="Downloadable reports"
        sub={
          scoped
            ? "CSV files covering your own students. They open straight in Excel or Sheets."
            : "CSV files covering the whole platform. They open straight in Excel or Sheets."
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map(({ key, name, icon: Icon, desc }) => (
          <Card key={key} className="flex flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-signal-soft)] text-[var(--color-signal)]">
                <Icon size={20} />
              </span>
              <h3 className="font-[family-name:var(--font-display-src)] text-base font-bold">
                {name}
              </h3>
            </div>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">{desc}</p>
            <a href={`${base}/${key}`} className="btn btn-primary mt-5 self-start">
              <Download size={16} /> Download CSV
            </a>
          </Card>
        ))}
      </div>
    </>
  );
}
