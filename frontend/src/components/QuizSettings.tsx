import { useState } from "react";
import type { Difficulty, QuizGenerateRequest, QuizType } from "../types";
import { cn, QUESTION_TYPE_LABELS } from "../lib/utils";

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: "easy", label: "Easy", hint: "Recall" },
  { value: "medium", label: "Medium", hint: "Understanding" },
  { value: "hard", label: "Hard", hint: "Applying it" },
];

const TYPES: QuizType[] = ["mcq", "short_answer", "true_false", "fill_blank"];

export type QuizSettingsValue = Omit<QuizGenerateRequest, "doc_id">;

export function useQuizSettings() {
  const [topic, setTopic] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuizType[]>(["mcq", "short_answer"]);

  const toggleType = (t: QuizType) =>
    setQuestionTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const value: QuizSettingsValue = {
    topic: topic.trim() || undefined,
    curriculum: curriculum.trim() || undefined,
    difficulty,
    question_types: questionTypes,
    num_questions: numQuestions,
  };

  return {
    value,
    isValid: questionTypes.length > 0,
    fields: {
      topic, setTopic, curriculum, setCurriculum, difficulty, setDifficulty,
      numQuestions, setNumQuestions, questionTypes, toggleType,
    },
  };
}

export default function QuizSettings({ settings }: { settings: ReturnType<typeof useQuizSettings> }) {
  const f = settings.fields;

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="quiz-topic" className="field-label">
          Focus on a topic <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="quiz-topic"
          className="field"
          placeholder="Leave blank to cover the whole document"
          value={f.topic}
          onChange={(e) => f.setTopic(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="quiz-curriculum" className="field-label">
          Course or exam board <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="quiz-curriculum"
          className="field"
          placeholder="For example, AP Biology or CBSE Grade 10"
          value={f.curriculum}
          onChange={(e) => f.setCurriculum(e.target.value)}
        />
        <p className="mt-1.5 text-sm text-ink-muted">Questions are pitched at that level.</p>
      </div>

      <fieldset>
        <legend className="field-label">Difficulty</legend>
        <div className="grid grid-cols-3 rounded-md border border-rule overflow-hidden" role="radiogroup">
          {DIFFICULTIES.map((d, i) => {
            const active = f.difficulty === d.value;
            return (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => f.setDifficulty(d.value)}
                className={cn(
                  "py-2.5 px-2 text-left transition-colors",
                  i > 0 && "border-l border-rule",
                  active ? "bg-ink text-white" : "bg-paper text-ink hover:bg-desk"
                )}
              >
                <span className="block font-bold text-[0.95rem] leading-tight">{d.label}</span>
                <span className={cn("block text-xs", active ? "text-white/70" : "text-ink-muted")}>
                  {d.hint}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Kinds of question</legend>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => {
            const on = f.questionTypes.includes(t);
            return (
              <label
                key={t}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer transition-colors",
                  on ? "border-ink bg-paper" : "border-rule bg-paper hover:border-ink-faint"
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => f.toggleType(t)}
                  className="h-4 w-4 accent-[#2340B8]"
                />
                <span className="text-[0.95rem]">{QUESTION_TYPE_LABELS[t]}</span>
              </label>
            );
          })}
        </div>
        {!settings.isValid && (
          <p className="mt-2 text-sm text-marker">Pick at least one kind of question.</p>
        )}
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="quiz-count" className="field-label">Number of questions</label>
          <span className="font-bold tabular-nums">{f.numQuestions}</span>
        </div>
        <input
          id="quiz-count"
          type="range"
          min={1}
          max={15}
          value={f.numQuestions}
          onChange={(e) => f.setNumQuestions(Number(e.target.value))}
          className="w-full accent-[#2340B8]"
        />
        <div className="flex justify-between text-xs text-ink-muted">
          <span>1</span>
          <span>15</span>
        </div>
      </div>
    </div>
  );
}
