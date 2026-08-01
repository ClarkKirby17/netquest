import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Check, X, ArrowLeft, PartyPopper } from "lucide-react";
import { db, quizAttempts } from "@/db";
import { requireRole } from "@/lib/guard";
import { attemptReview } from "@/lib/quiz";
import { Card, PageHead, Pill, Progress } from "@/components/ui";

export default async function QuizResultPage({
  params,
  searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const me = await requireRole("student");
  const { id } = await params;
  const { attempt: attemptParam } = await searchParams;
  const quizId = Number(id);
  if (!quizId) notFound();

  /* Named attempt, or the most recent one for this quiz. */
  let attemptId = Number(attemptParam || 0);
  if (!attemptId) {
    const latest = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, me.userId)))
      .orderBy(desc(quizAttempts.submittedAt))
      .limit(1);
    attemptId = latest[0]?.id ?? 0;
  }
  if (!attemptId) notFound();

  const review = await attemptReview(me.userId, attemptId);
  if (!review) notFound();

  const { attempt, quiz, module: mod, items } = review;
  const correctCount = items.filter((i) => i.right).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/student/quizzes"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> All quizzes
      </Link>

      <PageHead
        eyebrow={mod ? `module ${mod.moduleNumber} · ${mod.title}` : "quiz"}
        title={attempt.passed ? "You passed" : "Not quite yet"}
        sub={`Attempt ${attempt.attemptNumber} · ${new Date(attempt.submittedAt).toLocaleString()}`}
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div
              className={
                "font-[family-name:var(--font-display-src)] text-5xl font-bold " +
                (attempt.passed ? "text-[var(--color-signal)]" : "text-[var(--color-warn)]")
              }
            >
              {attempt.percent}%
            </div>
            <div className="mt-1 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
              {attempt.score} / {attempt.maxScore} points
            </div>
          </div>

          <div className="min-w-[200px] flex-1">
            <Progress value={attempt.percent} label={`Pass mark ${quiz.passingScore}%`} />
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {correctCount} of {items.length} correct
            </p>
          </div>

          {attempt.passed ? (
            <Pill tone="signal"><Check size={11} />passed</Pill>
          ) : (
            <Pill tone="warn">{quiz.passingScore - attempt.percent}% short</Pill>
          )}
        </div>

        {attempt.passed && (
          <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-5 py-4">
            <PartyPopper size={18} className="mt-0.5 shrink-0 text-[var(--color-signal)]" />
            <div>
              <p className="font-semibold text-[var(--color-signal)]">Module complete</p>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                The next module just unlocked.{" "}
                <Link href="/student/modules" className="text-[var(--color-signal)] underline">
                  Keep going
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 font-[family-name:var(--font-display-src)] text-xl font-bold">
        Answer review
      </h2>

      <div className="space-y-3">
        {items.map((item, i) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start gap-3">
              <span
                className={
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full " +
                  (item.right
                    ? "bg-[var(--color-signal-soft)] text-[var(--color-signal)]"
                    : "bg-[rgba(255,77,109,.12)] text-[var(--color-alert)]")
                }
              >
                {item.right ? <Check size={12} /> : <X size={12} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                    {String(i + 1).padStart(2, "0")}.
                  </span>{" "}
                  {item.question}
                </p>

                <ul className="mt-3 space-y-1.5">
                  {item.options.map(([key, text]) => {
                    const isCorrect = key === item.correct;
                    const isChosen = key === item.chosen;
                    return (
                      <li
                        key={key}
                        className={
                          "rounded-[8px] px-3 py-2 text-sm " +
                          (isCorrect
                            ? "bg-[var(--color-signal-soft)] text-[var(--color-signal)]"
                            : isChosen
                              ? "bg-[rgba(255,77,109,.1)] text-[var(--color-alert)]"
                              : "text-[var(--color-muted)]")
                        }
                      >
                        <span className="font-[family-name:var(--font-mono-src)] text-xs">{key}.</span>{" "}
                        {text}
                        {isCorrect && " ✓ correct"}
                        {isChosen && !isCorrect && " ← your answer"}
                      </li>
                    );
                  })}
                </ul>

                {!item.chosen && (
                  <p className="mt-2 text-xs text-[var(--color-warn)]">You left this blank.</p>
                )}
                {item.explanation && (
                  <p className="mt-3 border-l-2 border-[var(--color-line)] pl-3 text-sm text-[var(--color-muted)]">
                    {item.explanation}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!attempt.passed && (
        <div className="mt-6">
          <Link href="/student/quizzes" className="btn btn-primary">Back to quizzes</Link>
        </div>
      )}
    </div>
  );
}
