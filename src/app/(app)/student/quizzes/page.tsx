import Link from "next/link";
import { GraduationCap, Lock, Check, Clock, Ban } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { modulesForStudent } from "@/lib/learning";
import { quizStateFor } from "@/lib/quiz";
import { Card, CardHead, PageHead, Pill, Led, Empty, Progress } from "@/components/ui";

export default async function StudentQuizzesPage() {
  const me = await requireRole("student");
  const cards = await modulesForStudent(me.userId);

  const rows = await Promise.all(
    cards.map(async (c) => ({
      card: c,
      quiz: await quizStateFor(me.userId, c.id, c.lessonsComplete),
    }))
  );
  const withQuiz = rows.filter((r) => r.quiz.status !== "none");

  return (
    <>
      <PageHead
        eyebrow="assessment"
        title="Quizzes"
        sub="Finish a module's lessons to unlock its quiz. Passing completes the module."
      />

      {withQuiz.length === 0 ? (
        <Card>
          <Empty
            icon={GraduationCap}
            title="No quizzes yet"
            body="When your instructor publishes a quiz, it appears here once you've read the module."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {withQuiz.map(({ card, quiz }) => (
            <Card key={card.id} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <Led
                  state={quiz.status === "passed" ? "done" : quiz.status === "available" ? "live" : "off"}
                  className="mt-2"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                      M{card.moduleNumber}
                    </span>
                    {quiz.status === "passed" && <Pill tone="signal"><Check size={11} />passed</Pill>}
                    {quiz.status === "locked" && <Pill><Lock size={11} />locked</Pill>}
                    {quiz.status === "cooldown" && <Pill tone="warn"><Clock size={11} />cooldown</Pill>}
                    {quiz.status === "exhausted" && <Pill tone="alert"><Ban size={11} />no attempts left</Pill>}
                    {quiz.status === "available" && <Pill tone="signal">ready</Pill>}
                  </div>

                  <h3 className="mt-1.5 font-[family-name:var(--font-display-src)] text-lg font-bold">
                    {quiz.title}
                  </h3>

                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {quiz.questionCount} questions · pass mark {quiz.passingScore}%
                    {quiz.maxAttempts > 0 && ` · ${quiz.attemptsUsed}/${quiz.maxAttempts} attempts used`}
                    {quiz.maxAttempts === 0 && quiz.attemptsUsed > 0 && ` · ${quiz.attemptsUsed} attempts`}
                  </p>

                  {quiz.attemptsUsed > 0 && (
                    <div className="mt-3 max-w-xs">
                      <Progress value={quiz.bestPercent} label={`Best score ${quiz.bestPercent}%`} />
                    </div>
                  )}

                  {quiz.status === "locked" && (
                    <p className="mt-3 text-xs text-[var(--color-muted)]">
                      Read all {card.lessonCount} lessons in this module to unlock the quiz
                      ({card.lessonsDone}/{card.lessonCount} done).
                    </p>
                  )}
                  {quiz.status === "cooldown" && quiz.retryAt && (
                    <p className="mt-3 text-xs text-[var(--color-warn)]">
                      You can try again after {quiz.retryAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {quiz.status === "available" && (
                    <Link href={`/student/quizzes/${quiz.quizId}`} className="btn btn-primary">
                      {quiz.attemptsUsed > 0 ? "Try again" : "Start quiz"}
                    </Link>
                  )}
                  {quiz.lastAttemptId && (
                    <Link
                      href={`/student/quizzes/${quiz.quizId}/result`}
                      className="btn btn-ghost px-3 py-1.5 text-[.82rem]"
                    >
                      Review answers
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
