import { Card, CardHead, Pill, Empty } from "@/components/ui";
import { Gamepad2 } from "lucide-react";
import { saveDoorQuestion, deleteDoorQuestion, toggleDoorQuestion } from "@/lib/question-actions";

const inputCx =
  "w-full rounded-[10px] border border-[var(--color-line)] bg-[rgba(255,255,255,.03)] px-3.5 py-2.5 text-[.9rem] outline-none transition-colors placeholder:text-[#3d4f6b] focus:border-[var(--color-signal)]";
const labelCx =
  "mb-1.5 block font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]";

export type DoorQ = {
  id: number;
  question: string;
  optionA: string; optionB: string; optionC: string;
  correctOption: string; explanation: string;
  difficulty: "easy" | "medium" | "hard";
  active: boolean;
};

export default function QuestionManager({
  scope,
  questions,
  globalCount = 0 }: {
  scope: "mine" | "global";
  questions: DoorQ[];
  globalCount?: number;
}) {
  const tone = { easy: "signal", medium: "warn", hard: "alert" } as const;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHead
          title={scope === "global" ? "Global pool" : "My questions"}
          sub={
            scope === "global"
              ? "Every student sees these, whoever teaches them."
              : `Layered on top of the ${globalCount} global question${globalCount === 1 ? "" : "s"} — your students see both.`
          }
        />
        {questions.length === 0 ? (
          <Empty
            icon={Gamepad2}
            title="No questions yet"
            body={
              scope === "global"
                ? "Add questions every section will draw from."
                : "Add your own, or leave this empty and your students will use the global pool."
            }
          />
        ) : (
          <div className="divide-y divide-[var(--color-line)]">
            {questions.map((q) => {
              const opts: [string, string][] = [["A", q.optionA], ["B", q.optionB], ["C", q.optionC]];
              return (
                <div key={q.id} className={"px-5 py-4 " + (q.active ? "" : "opacity-50")}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Pill tone={tone[q.difficulty]}>{q.difficulty}</Pill>
                        {!q.active && <Pill>hidden</Pill>}
                      </div>
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
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <form action={toggleDoorQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="scope" value={scope} />
                        <input type="hidden" name="active" value={q.active ? "0" : "1"} />
                        <button className="btn btn-ghost w-full px-2.5 py-1 text-[.78rem]">
                          {q.active ? "Hide" : "Show"}
                        </button>
                      </form>
                      <form action={deleteDoorQuestion}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="scope" value={scope} />
                        <button className="btn w-full px-2.5 py-1 text-[.78rem] border border-[rgba(255,77,109,.3)] bg-[rgba(255,77,109,.08)] text-[var(--color-alert)] hover:bg-[rgba(255,77,109,.16)]">
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

      <Card className="h-fit p-5">
        <h2 className="mb-4 text-[.95rem] font-semibold">Add a question</h2>
        <form action={saveDoorQuestion} className="space-y-3">
          <input type="hidden" name="scope" value={scope} />
          <div>
            <label htmlFor="question" className={labelCx}>Question</label>
            <textarea id="question" name="question" rows={2} required minLength={4}
              placeholder="Which device forwards packets between networks?" className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionA" className={labelCx}>Door A</label>
            <input id="optionA" name="optionA" required className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionB" className={labelCx}>Door B</label>
            <input id="optionB" name="optionB" required className={inputCx} />
          </div>
          <div>
            <label htmlFor="optionC" className={labelCx}>Door C</label>
            <input id="optionC" name="optionC" required className={inputCx} />
          </div>
          <div>
            <label htmlFor="correctOption" className={labelCx}>Correct door</label>
            <select id="correctOption" name="correctOption" defaultValue="A" className={inputCx + " cursor-pointer"}>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </div>
          <div>
            <label htmlFor="difficulty" className={labelCx}>Difficulty</label>
            <select id="difficulty" name="difficulty" defaultValue="easy" className={inputCx + " cursor-pointer"}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label htmlFor="explanation" className={labelCx}>Explanation</label>
            <textarea id="explanation" name="explanation" rows={2}
              placeholder="Shown after the door opens or slams." className={inputCx} />
          </div>
          <button className="btn btn-primary w-full">Add question</button>
        </form>
      </Card>
    </div>
  );
}
