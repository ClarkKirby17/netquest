"use client";

import { useState } from "react";
import { saveQuestion } from "@/lib/quiz-actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.9rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export default function QuestionForm({
  quizId,
  moduleId,
  scope = "mine" }: {
  quizId: number;
  moduleId: number;
  scope?: "mine" | "default";
}) {
  const [type, setType] = useState<"multiple_choice" | "true_false">("multiple_choice");
  const isTF = type === "true_false";

  return (
    <form action={saveQuestion} className="space-y-3">
      <input type="hidden" name="quizId" value={quizId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="type" value={type} />

      <div>
        <label className={labelCx}>Question type</label>
        <div className="grid grid-cols-2 gap-2">
          {([["multiple_choice", "Multiple choice"], ["true_false", "True / false"]] as const).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={
                  "rounded-[10px] border px-3 py-2 text-sm transition-colors " +
                  (type === value
                    ? "border-[var(--color-signal)] bg-[var(--color-signal-soft)] text-[var(--color-signal)]"
                    : "border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-muted)]")
                }
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      <div>
        <label htmlFor="question" className={labelCx}>Question</label>
        <textarea id="question" name="question" rows={2} required minLength={4}
          placeholder="Which device forwards packets between networks?" className={inputCx} />
      </div>

      {!isTF && (
        <>
          <div>
            <label htmlFor="optionA" className={labelCx}>Option A</label>
            <input id="optionA" name="optionA" required className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionB" className={labelCx}>Option B</label>
            <input id="optionB" name="optionB" required className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionC" className={labelCx}>Option C <span className="normal-case tracking-normal">(optional)</span></label>
            <input id="optionC" name="optionC" className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionD" className={labelCx}>Option D <span className="normal-case tracking-normal">(optional)</span></label>
            <input id="optionD" name="optionD" className={inputCx} />
          </div>
        </>
      )}

      <div>
        <label htmlFor="correctOption" className={labelCx}>Correct answer</label>
        <select id="correctOption" name="correctOption" className={inputCx + " cursor-pointer"} defaultValue="A">
          {isTF ? (
            <>
              <option value="A">True</option>
              <option value="B">False</option>
            </>
          ) : (
            <>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </>
          )}
        </select>
      </div>

      <div>
        <label htmlFor="explanation" className={labelCx}>Explanation</label>
        <textarea id="explanation" name="explanation" rows={2}
          placeholder="Shown after the attempt, right or wrong." className={inputCx} />
      </div>

      <div>
        <label htmlFor="points" className={labelCx}>Points</label>
        <input id="points" name="points" type="number" min={1} defaultValue={1} className={inputCx} />
      </div>

      <button className="btn btn-primary w-full">Add question</button>
    </form>
  );
}
