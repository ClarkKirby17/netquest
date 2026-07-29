import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardHead, Table, Th, Td, Pill, Led, Empty } from "@/components/ui";
import { createQuiz } from "@/lib/quiz-actions";

export type QuizRow = {
  moduleId: number;
  moduleNumber: number;
  moduleTitle: string;
  quizId: number | null;
  published: boolean | null;
  passingScore: number | null;
  questionCount: number;
  defaultQuestionCount?: number;
};

export default function QuizList({
  rows,
  scope,
}: {
  rows: QuizRow[];
  scope: "mine" | "default";
}) {
  const base = scope === "default" ? "/admin/quizzes" : "/instructor/quizzes";
  return (
    <Card>
      <CardHead
        title="By module"
        sub={
          scope === "default"
            ? "Shared templates. Professors copy these as a starting point."
            : "Your own quizzes. Students you teach take these."
        }
      />
      {rows.length === 0 ? (
        <Empty icon={GraduationCap} title="No modules yet" body="Modules appear here once admin publishes the curriculum." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th className="w-14">#</Th><Th>Module</Th><Th>Questions</Th>
              <Th>Pass mark</Th><Th>Status</Th><Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.moduleId}>
                <Td>
                  <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                    M{r.moduleNumber}
                  </span>
                </Td>
                <Td className="font-medium">{r.moduleTitle}</Td>
                <Td className="text-[var(--color-muted)]">{r.quizId ? r.questionCount : "—"}</Td>
                <Td className="text-[var(--color-muted)]">{r.quizId ? `${r.passingScore}%` : "—"}</Td>
                <Td>
                  {!r.quizId && scope === "mine" && (r.defaultQuestionCount ?? 0) > 0 && (
                    <Pill tone="wire">default applies</Pill>
                  )}
                  {!r.quizId && (scope === "default" || (r.defaultQuestionCount ?? 0) === 0) && <Pill>none</Pill>}
                  {r.quizId && r.published && <Pill tone="signal"><Led state="done" />live</Pill>}
                  {r.quizId && !r.published && <Pill tone="warn">draft</Pill>}
                </Td>
                <Td className="text-right">
                  {r.quizId ? (
                    <Link href={`${base}/${r.moduleId}`} className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                      Edit
                    </Link>
                  ) : (
                    <form action={createQuiz}>
                      <input type="hidden" name="moduleId" value={r.moduleId} />
                      <input type="hidden" name="scope" value={scope} />
                      <button className="btn btn-primary px-3 py-1.5 text-[.82rem]">
                        {scope === "default" ? "Create default" : "Create my quiz"}
                      </button>
                    </form>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
