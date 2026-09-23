import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { getSessionReport } from "../lib/api";
import type { SessionReport } from "../types";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { CircledGrade, Mark } from "../components/ui/Mark";
import { cn, QUESTION_TYPE_LABELS, scoreToPercent } from "../lib/utils";

type Row = SessionReport["question_breakdown"][number];

function QuestionRow({ q, index }: { q: Row; index: number }) {
  const [open, setOpen] = useState(false);
  const answered = q.is_correct !== null;
  const pct = q.score_percentage ?? (q.score !== null ? Math.round(q.score * 100) : null);
  const rubric = (q.rubric_feedback ?? []).filter((r) => r.comment);
  const panelId = `q-${q.question_id}`;

  return (
    <li>
      <button
        className="w-full grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-desk/60 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        disabled={!answered}
      >
        <span className="text-center" aria-label={!answered ? "Not answered" : q.is_correct ? "Correct" : "Incorrect"}>
          {!answered ? (
            <span className="text-ink-faint font-bold">{index + 1}</span>
          ) : (
            <Mark animate={false} tone={q.is_correct ? "right" : "marker"} className="text-3xl">
              {q.is_correct ? "✓" : "✗"}
            </Mark>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{q.question_text}</span>
          <span className="block text-sm text-ink-muted truncate">
            {QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type}
            {q.topic_tag ? `, ${q.topic_tag.replace(/_/g, " ")}` : ""}
          </span>
        </span>
        <span className={cn("font-bold tabular-nums", !answered && "text-ink-faint text-sm font-normal")}>
          {answered && pct !== null ? `${pct}%` : "Skipped"}
        </span>
        {answered ? (
          <ChevronDown className={cn("w-4 h-4 text-ink-faint transition-transform", open && "rotate-180")} aria-hidden />
        ) : (
          <span className="w-4" />
        )}
      </button>

      {open && answered && (
        <div id={panelId} className="px-4 sm:px-6 pb-6 sm:pl-[4.75rem] space-y-4 animate-fade-in">
          <p className="font-bold leading-relaxed">{q.question_text}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {q.student_answer && (
              <div className={cn("rounded-md px-4 py-3", q.is_correct ? "bg-right-wash" : "bg-marker-wash")}>
                <p className="text-sm font-bold">Your answer</p>
                <p className={cn(q.is_correct ? "text-right" : "text-marker")}>{q.student_answer}</p>
              </div>
            )}
            {!q.is_correct && q.correct_answer && (
              <div className="rounded-md px-4 py-3 bg-right-wash">
                <p className="text-sm font-bold">Correct answer</p>
                <p className="text-right">{q.correct_answer}</p>
              </div>
            )}
          </div>
          {q.detailed_explanation && <p className="text-ink-soft leading-relaxed">{q.detailed_explanation}</p>}
          {rubric.length > 1 && (
            <dl className="space-y-2 border-l-2 border-rule pl-4">
              {rubric.map((r) => (
                <div key={r.criterion}>
                  <dt className="font-bold">
                    {r.criterion} <span className="tabular-nums text-ink-muted font-normal">{Math.round(r.score * 100)}%</span>
                  </dt>
                  <dd className="text-ink-soft text-[0.95rem]">{r.comment}</dd>
                </div>
              ))}
            </dl>
          )}
          {!q.is_correct && q.improvement_tip && (
            <p className="bg-highlight-soft rounded-md px-4 py-3">
              <span className="font-bold">Next time: </span>
              {q.improvement_tip}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => getSessionReport(sessionId!),
    enabled: !!sessionId,
  });

  if (isError) {
    return (
      <div className="max-w-xl sheet p-8">
        <h1 className="text-heading">These results couldn’t be opened</h1>
        <p className="mt-2 text-ink-soft">The quiz may have been removed, or the link is wrong.</p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")}>Back to your desk</Button>
      </div>
    );
  }

  if (isLoading || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Spinner size="lg" />
        <p className="text-ink-muted">Adding up your marks…</p>
      </div>
    );
  }

  const scorePct = scoreToPercent(report.overall_score);
  const correct = report.correct_count;
  const unanswered = report.total_questions - report.answered;
  const maxGap = Math.max(1, ...report.knowledge_gaps.map((g) => g.frequency));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <button
        onClick={() => navigate("/dashboard")}
        className="inline-flex items-center gap-1 font-bold text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="w-4 h-4" aria-hidden />
        Your desk
      </button>

      {/* The marked paper: grade circled at the top */}
      <section className="sheet ruled px-6 sm:px-10 py-8 grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 items-center">
        <div className="justify-self-center sm:justify-self-start">
          <CircledGrade grade={report.grade} />
        </div>
        <div>
          <h1 className="text-title">
            {scorePct}%{" "}
            <span className="text-ink-muted font-normal text-heading">
              on {report.answered} of {report.total_questions} questions
            </span>
          </h1>
          <p className="mt-2 text-ink-soft">
            {correct} right, {report.answered - correct} wrong
            {unanswered > 0 ? `, ${unanswered} not answered` : ""}.
          </p>
          <p className="mt-4 leading-relaxed max-w-prose">{report.recommendation}</p>
        </div>
      </section>

      {/* What to revise */}
      {report.knowledge_gaps.length > 0 && (
        <section className="sheet px-6 sm:px-10 py-7" aria-labelledby="gaps-heading">
          <h2 id="gaps-heading" className="text-heading">What to revise</h2>
          <p className="mt-1 text-ink-muted">Topics that came up in answers you lost marks on, most often first.</p>
          <ul className="mt-6 space-y-4">
            {report.knowledge_gaps.map((g) => (
              <li key={g.topic} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-4">
                <span className="font-bold capitalize truncate" title={g.topic}>
                  {g.topic.replace(/[_-]/g, " ")}
                </span>
                <span className="h-3 rounded-sm bg-desk overflow-hidden" aria-hidden>
                  <span
                    className="block h-full bg-highlight"
                    style={{ width: `${(g.frequency / maxGap) * 100}%` }}
                  />
                </span>
                <span className="text-sm text-ink-muted tabular-nums">
                  {g.frequency} {g.frequency === 1 ? "time" : "times"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Every question */}
      <section aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="text-heading mb-4">Each question</h2>
        <ol className="sheet divide-y divide-rule-soft">
          {report.question_breakdown.map((q, i) => (
            <QuestionRow key={q.question_id} q={q} index={i} />
          ))}
        </ol>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        {unanswered > 0 && (
          <Button variant="secondary" onClick={() => navigate(`/quiz/${report.session_id}`)}>
            Finish this quiz
          </Button>
        )}
        <Button onClick={() => navigate("/dashboard")}>Make another quiz</Button>
      </div>
    </div>
  );
}
