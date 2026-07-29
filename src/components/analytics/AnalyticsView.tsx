import { Users, BookOpen, GraduationCap, Gamepad2, TrendingDown, Trophy } from "lucide-react";
import { Card, CardHead, StatTile, Table, Th, Td, Empty } from "@/components/ui";
import { PercentBars, CountBars } from "./Charts";

type Data = Awaited<ReturnType<typeof import("@/lib/reports").analytics>>;

export default function AnalyticsView({ data }: { data: Data }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Active students" value={data.kpis.students} />
        <StatTile icon={BookOpen} label="Live modules" value={data.kpis.modules} tone="wire" />
        <StatTile
          icon={GraduationCap}
          label="Quiz pass rate"
          value={`${data.kpis.passRate}%`}
          hint={`${data.kpis.attempts} attempts`}
          tone="warn"
        />
        <StatTile icon={Gamepad2} label="Arcade runs · 7d" value={data.kpis.arcadeRuns} tone="plain" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Module completion" sub="Share of students who finished each module." />
          <div className="p-4"><PercentBars data={data.funnel} /></div>
        </Card>

        <Card>
          <CardHead title="Quiz pass rate" sub="Per module quiz, across all attempts." />
          <div className="p-4"><PercentBars data={data.quizRates} color="#f6a821" /></div>
        </Card>

        <Card>
          <CardHead title="Arcade activity" sub="Runs in the last 7 days." />
          <div className="p-4"><CountBars data={data.arcade} /></div>
        </Card>

        <Card>
          <CardHead title="Level distribution" sub="How far students have levelled." />
          <div className="p-4"><CountBars data={data.levels} colors={["#00c9ff"]} /></div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Where students stall" sub="Lessons opened but not finished." />
          {data.stalled.length === 0 ? (
            <Empty icon={TrendingDown} title="Nothing stalling" body="No lessons are sitting unfinished." />
          ) : (
            <Table>
              <thead><tr><Th className="w-14">#</Th><Th>Lesson</Th><Th className="text-right">Stuck</Th></tr></thead>
              <tbody>
                {data.stalled.map((s, i) => (
                  <tr key={i}>
                    <Td>
                      <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        M{s.moduleNumber}
                      </span>
                    </Td>
                    <Td className="font-medium">{s.title}</Td>
                    <Td className="text-right">
                      <span className="font-[family-name:var(--font-mono-src)] text-[var(--color-warn)]">
                        {s.stuck}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHead title="Top students" sub="By total points." />
          {data.topStudents.length === 0 ? (
            <Empty icon={Trophy} title="No points yet" body="Rankings appear once students start earning." />
          ) : (
            <Table>
              <thead><tr><Th className="w-14">#</Th><Th>Student</Th><Th>Section</Th><Th className="text-right">Points</Th></tr></thead>
              <tbody>
                {data.topStudents.map((t, i) => (
                  <tr key={i}>
                    <Td>{["🥇", "🥈", "🥉"][i] ?? `#${i + 1}`}</Td>
                    <Td className="font-medium">{t.name}</Td>
                    <Td className="text-[var(--color-muted)]">{t.section}</Td>
                    <Td className="text-right">
                      <span className="font-[family-name:var(--font-mono-src)] font-bold text-[var(--color-signal)]">
                        {t.points}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
