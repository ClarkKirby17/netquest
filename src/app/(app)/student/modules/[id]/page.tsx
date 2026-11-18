import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Check, FileText, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { lessonsForStudent, modulesForStudent } from "@/lib/learning";
import { quizStateFor } from "@/lib/quiz";
import { Card, CardHead, PageHead, Progress, Pill, Empty } from "@/components/ui";

export default async function ModuleLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("student");
  const { id } = await params;
  const moduleId = Number(id);
  if (!moduleId) {
    console.error("[module page] bad id param:", id);
    notFound();
  }

  const cards = await modulesForStudent(me.userId);
  const card = cards.find((c) => Number(c.id) === moduleId);
  if (!card) {
    console.error(
      "[module page] no card for id",
      moduleId,
      "available:",
      cards.map((c) => ({ id: c.id, n: c.moduleNumber, state: c.state }))
    );
    notFound();
  }
  if (card.state === "locked") {
    console.error("[module page] card is locked:", card);
    notFound();
  }

  const rows = await lessonsForStudent(me.userId, card.id);
  const quiz = await quizStateFor(me.userId, card.id, card.lessonsComplete);

  return (
    <>
      <Link
        href="/student/modules"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> All modules
      </Link>

      <PageHead eyebrow={`module ${card.moduleNumber}`} title={card.title} sub={card.description} />

      <div className="mb-4 max-w-md">
        <Progress value={card.percent} label={`${card.lessonsDone} of ${card.lessonCount} lessons complete`} />
      </div>

      <Card>
        <CardHead title="Lessons" sub="Read them in order." />
        {rows.length === 0 ? (
          <Empty icon={FileText} title="No lessons yet" body="Your instructor hasn't added lessons to this module." />
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {rows.map((l) => {
              const locked = l.state === "locked";
              const inner = (
                <div
                  className={
                    "flex items-center gap-4 px-5 py-4 transition-colors " +
                    (locked ? "opacity-50" : "hover:bg-[rgba(255,255,255,.02)]")
                  }
                >
                  <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                    {card.moduleNumber}.{l.order}
                  </span>
                  <span className={locked ? "flex-1 text-[var(--color-muted)]" : "flex-1 font-medium"}>
                    {l.title}
                  </span>
                  {l.completed && <Pill tone="signal"><Check size={11} />done</Pill>}
                  {locked && <Pill><Lock size={11} />locked</Pill>}
                  {!locked && !l.completed && l.furthestPage > 0 && <Pill tone="warn">in progress</Pill>}
                </div>
              );
              return locked ? (
                <div key={l.id}>{inner}</div>
              ) : (
                <Link key={l.id} href={`/student/lessons/${l.id}`} className="block">
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {quiz.status !== "none" && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-[family-name:var(--font-display-src)] text-lg font-bold">
                {quiz.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {quiz.questionCount} questions · pass mark {quiz.passingScore}%
                {quiz.status === "locked" && " · finish every lesson to unlock"}
                {quiz.status === "passed" && ` · best ${quiz.bestPercent}%`}
              </p>
            </div>
            {quiz.status === "available" && (
              <Link href={`/student/quizzes/${quiz.quizId}`} className="btn btn-primary">
                {quiz.attemptsUsed > 0 ? "Try again" : "Take quiz"}
              </Link>
            )}
            {quiz.status === "passed" && <Pill tone="signal"><Check size={11} />passed</Pill>}
            {quiz.status === "locked" && <Pill><Lock size={11} />locked</Pill>}
          </div>
        </Card>
      )}
    </>
  );
}