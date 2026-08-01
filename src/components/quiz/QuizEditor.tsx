import Link from "next/link";
import { ArrowLeft, HelpCircle, Copy } from "lucide-react";
import { Card, CardHead, PageHead, Pill, Empty } from "@/components/ui";
import QuestionForm from "./QuestionForm";
import {
  updateQuizSettings, toggleQuizPublish, deleteQuestion, copyDefaultQuestions } from "@/lib/quiz-actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.925rem] outline-none transition-colors focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export type QuizEditorProps = {
  scope: "mine" | "default";
  moduleId: number;
  moduleNumber: number;
  moduleTitle: string;
  quiz: {
    id: number; title: string; passingScore: number;
    maxAttempts: number; cooldownMinutes: number; isPublished: boolean;
  };
  questions: {
    id: number; question: string; optionA: string; optionB: string;
    optionC: string | null; optionD: string | null;
    correctOption: string; explanation: string; points: number;
  }[];
  defaultQuestionCount?: number;
};

export default function QuizEditor({
  scope, moduleId, moduleNumber, moduleTitle, quiz, questions, defaultQuestionCount = 0 }: QuizEditorProps) {
  const base = scope === "default" ? "/admin/quizzes" : "/instructor/quizzes";

  return (
    <>
      <Link
        href={base}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> All quizzes
      </Link>

      <PageHead
        eyebrow={`module ${moduleNumber} · ${moduleTitle}`}
        title={quiz.title}
        sub={
          scope === "default"
            ? "Shared template. Professors copy this; students only take it when their own professor hasn't written one."
            : quiz.isPublished
              ? "Live — your students must pass this to complete the module."
              : "Draft — publish it when the questions are ready."
        }
        action={
          <form action={toggleQuizPublish}>
            <input type="hidden" name="id" value={quiz.id} />
            <input type="hidden" name="moduleId" value={moduleId} />
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="publish" value={quiz.isPublished ? "0" : "1"} />
            <button
              className={quiz.isPublished ? "btn btn-ghost" : "btn btn-primary"}
              disabled={!quiz.isPublished && questions.length === 0}
              title={!quiz.isPublished && questions.length === 0 ? "Add at least one question first" : undefined}
            >
              {quiz.isPublished ? "Unpublish" : "Publish quiz"}
            </button>
          </form>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHead
            title="Questions"
            sub={`${questions.length} in this quiz`}
            action={
              quiz.isPublished
                ? <Pill tone="signal">live</Pill>
                : <Pill tone="warn">draft</Pill>
            }
          />

          {scope === "mine" && questions.length === 0 && defaultQuestionCount > 0 && (
            <div className="border-b border-[var(--color-line)] px-5 py-4">
              <form action={copyDefaultQuestions} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="quizId" value={quiz.id} />
                <input type="hidden" name="moduleId" value={moduleId} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Start from the default</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Copies {defaultQuestionCount} question{defaultQuestionCount === 1 ? "" : "s"} from
                    the admin template. Edit them freely afterwards.
                  </p>
                </div>
                <button className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
                  <Copy size={14} /> Copy default
                </button>
              </form>
            </div>
          )}

          {questions.length === 0 ? (
            <Empty icon={HelpCircle} title="No questions yet" body="Add the first one using the form beside this panel." />
          ) : (
            <div className="divide-y divide-[var(--color-line)]">
              {questions.map((q, i) => {
                const opts = [
                  ["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD],
                ].filter(([, t]) => Boolean(t)) as [string, string][];
                return (
                  <div key={q.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{q.question}</p>
                        <ul className="mt-2 space-y-1">
                          {opts.map(([k, text]) => (
                            <li
                              key={k}
                              className={
                                "text-sm " +
                                (k === q.correctOption.toUpperCase()
                                  ? "text-[var(--color-signal)]"
                                  : "text-[var(--color-muted)]")
                              }
                            >
                              <span className="font-[family-name:var(--font-mono-src)] text-xs">{k}.</span>{" "}
                              {text}
                              {k === q.correctOption.toUpperCase() && " ✓"}
                            </li>
                          ))}
                        </ul>
                        {q.explanation && (
                          <p className="mt-2 border-l-2 border-[var(--color-line)] pl-3 text-xs text-[var(--color-muted)]">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Pill>{q.points} pt</Pill>
                        <form action={deleteQuestion}>
                          <input type="hidden" name="id" value={q.id} />
                          <input type="hidden" name="moduleId" value={moduleId} />
                          <input type="hidden" name="scope" value={scope} />
                          <button className="btn px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 text-[.95rem] font-semibold">Add a question</h2>
            <QuestionForm quizId={quiz.id} moduleId={moduleId} scope={scope} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-[.95rem] font-semibold">Settings</h2>
            <form action={updateQuizSettings} className="space-y-3">
              <input type="hidden" name="id" value={quiz.id} />
              <input type="hidden" name="moduleId" value={moduleId} />
              <input type="hidden" name="scope" value={scope} />
              <div>
                <label htmlFor="title" className={labelCx}>Quiz title</label>
                <input id="title" name="title" defaultValue={quiz.title} required className={inputCx} />
              </div>
              <div>
                <label htmlFor="passingScore" className={labelCx}>Pass mark (%)</label>
                <input id="passingScore" name="passingScore" type="number" min={1} max={100} defaultValue={quiz.passingScore} className={inputCx} />
              </div>
              <div>
                <label htmlFor="maxAttempts" className={labelCx}>Max attempts</label>
                <input id="maxAttempts" name="maxAttempts" type="number" min={0} defaultValue={quiz.maxAttempts} className={inputCx} />
                <p className="mt-1 text-xs text-[var(--color-muted)]">0 means unlimited.</p>
              </div>
              <div>
                <label htmlFor="cooldownMinutes" className={labelCx}>Cooldown (minutes)</label>
                <input id="cooldownMinutes" name="cooldownMinutes" type="number" min={0} defaultValue={quiz.cooldownMinutes} className={inputCx} />
              </div>
              <button className="btn btn-primary">Save settings</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
