import Link from "next/link";
import { BookOpen, Lock, Check, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { modulesForStudent } from "@/lib/learning";
import { Card, PageHead, Progress, Pill, Led, Empty } from "@/components/ui";

export default async function StudentModulesPage() {
  const me = await requireRole("student");
  const cards = await modulesForStudent(me.userId);

  return (
    <>
      <PageHead
        eyebrow="learning path"
        title="Modules"
        sub="They unlock in order — finish one to open the next."
      />

      {cards.length === 0 ? (
        <Card>
          <Empty
            icon={BookOpen}
            title="No modules released yet"
            body="Your instructor is still preparing the course. Check back soon."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((m) => {
            const locked = m.state === "locked";
            const done = m.state === "completed";
            const body = (
              <Card
                hover={!locked}
                className={locked ? "p-5 opacity-55" : "p-5 h-full"}
              >
                <div className="flex items-start gap-3">
                  <Led state={done ? "done" : locked ? "off" : "live"} className="mt-2" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        M{m.moduleNumber}
                      </span>
                      {done && <Pill tone="signal"><Check size={11} />complete</Pill>}
                      {locked && <Pill><Lock size={11} />locked</Pill>}
                    </div>

                    <h3 className="mt-1.5 font-[family-name:var(--font-display-src)] text-lg font-bold">
                      {m.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
                      {m.description || "No description yet."}
                    </p>

                    <div className="mt-4">
                      <Progress
                        value={m.percent}
                        label={`${m.lessonsDone} of ${m.lessonCount} lessons`}
                      />
                    </div>

                    {!locked && m.lessonsComplete && m.hasQuiz && !m.quizPassed && (
                      <p className="mt-3 rounded-[8px] border border-[rgba(255,184,77,.3)] bg-[rgba(255,184,77,.08)] px-3 py-2 text-xs text-[var(--color-warn)]">
                        Lessons done — pass the module quiz to complete it.
                      </p>
                    )}

                    {!locked && (
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-signal)]">
                        {done ? "Review" : m.lessonsDone > 0 ? "Continue" : "Start"}
                        <ArrowRight size={14} />
                      </span>
                    )}
                    {locked && (
                      <p className="mt-4 text-xs text-[var(--color-muted)]">
                        Finish module {m.moduleNumber - 1} to unlock this.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );

            return locked ? (
              <div key={m.id}>{body}</div>
            ) : (
              <Link key={m.id} href={`/student/modules/${m.id}`} className="block">
                {body}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
