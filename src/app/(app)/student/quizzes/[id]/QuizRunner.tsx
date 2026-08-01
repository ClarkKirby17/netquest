"use client";

import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { Card, PageHead, Pill, Progress } from "@/components/ui";
import { submitQuiz } from "../actions";

/* The client tracks answers only for progress and the unanswered
   warning — every score is computed on the server. */
export default function QuizRunner({
  quizId, title, moduleNumber, moduleTitle, passingScore,
  attemptNumber, maxAttempts, questions }: {
  quizId: number;
  title: string;
  moduleNumber: number;
  moduleTitle: string;
  passingScore: number;
  attemptNumber: number;
  maxAttempts: number;
  questions: { id: number; question: string; points: number; options: [string, string][] }[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);

  const answered = Object.keys(answers).length;
  const total = questions.length;
  const unanswered = total - answered;

  return (
    <form action={submitQuiz} className="mx-auto max-w-3xl">
      <input type="hidden" name="quizId" value={quizId} />

      <PageHead
        eyebrow={`module ${moduleNumber} · ${moduleTitle}`}
        title={title}
        sub={`Pass mark ${passingScore}% · attempt ${attemptNumber}${maxAttempts > 0 ? ` of ${maxAttempts}` : ""}`}
      />

      <div className="sticky top-16 z-20 -mx-1 mb-6 bg-[var(--color-void)]/85 px-1 py-3 backdrop-blur-sm">
        <Progress value={total ? (answered / total) * 100 : 0} label={`${answered} of ${total} answered`} />
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{q.question}</p>
                  {q.points > 1 && <Pill>{q.points} pts</Pill>}
                </div>

                <div className="mt-3 space-y-2">
                  {q.options.map(([key, text]) => {
                    const checked = answers[q.id] === key;
                    return (
                      <label
                        key={key}
                        className={
                          "flex cursor-pointer items-start gap-3 rounded-[10px] border px-3.5 py-2.5 text-sm transition-colors " +
                          (checked
                            ? "border-[var(--color-signal)] bg-[var(--color-signal-soft)]"
                            : "border-[var(--color-line)] hover:border-[var(--color-muted)]")
                        }
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          value={key}
                          checked={checked}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: key }))}
                          className="mt-0.5 accent-[var(--color-signal)]"
                        />
                        <span>
                          <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
                            {key}.
                          </span>{" "}
                          {text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {confirming && unanswered > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-5 py-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--color-warn)]" />
          <div>
            <p className="font-medium text-[var(--color-warn)]">
              {unanswered} question{unanswered === 1 ? "" : "s"} still blank
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              Blank answers score zero. Submit anyway, or go back and finish them.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {unanswered > 0 && !confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="btn btn-primary">
            <Send size={16} /> Submit quiz
          </button>
        ) : (
          <button type="submit" className="btn btn-primary">
            <Send size={16} /> {confirming && unanswered > 0 ? "Submit anyway" : "Submit quiz"}
          </button>
        )}
        {confirming && unanswered > 0 && (
          <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost">
            Keep working
          </button>
        )}
        <span className="ml-auto font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
          {answered}/{total} answered
        </span>
      </div>
    </form>
  );
}
