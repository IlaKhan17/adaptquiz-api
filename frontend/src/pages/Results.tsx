import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSessionReport } from "../lib/api";
import Button from "../components/ui/Button";
import Card, { CardBody } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { gradeBg, scoreToPercent } from "../lib/utils";

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return <span>{display}</span>;
}

const GRADE_RING_COLOR: Record<string, string> = {
  "A+": "#10b981",
  A: "#10b981",
  B: "#3b82f6",
  C: "#f59e0b",
  "Needs Improvement": "#ef4444",
};

const BAR_COLORS = ["#ef4444", "#f59e0b", "#6366f1", "#8b5cf6", "#06b6d4"];

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", sessionId],
    queryFn: () => getSessionReport(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner size="lg" />
        <p className="text-gray-500">Loading results…</p>
      </div>
    );
  }

  const scorePct = scoreToPercent(report.overall_score);
  const ringColor = GRADE_RING_COLOR[report.grade] ?? "#6366f1";
  const circumference = 2 * Math.PI * 52;
  const strokeDash = (scorePct / 100) * circumference;

  const barData = report.knowledge_gaps.map((g) => ({
    name: g.topic.replace(/_/g, " "),
    frequency: g.frequency,
    // percentage of questions you attempted that were wrong in this topic
    percentage:
      report.answered > 0
        ? Math.round((g.frequency / report.answered) * 100)
        : 0,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/upload")}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          New Quiz
        </Button>
      </div>

      {/* Score hero */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row items-center gap-8 py-8">
          <div className="relative shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="12"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="52"
                fill="none"
                stroke={ringColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={circumference}
                animate={{ strokeDashoffset: circumference - strokeDash }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                transform="rotate(-90 64 64)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-gray-900">
                <AnimatedScore target={scorePct} />
                <span className="text-lg">%</span>
              </span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Quiz Complete!</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold border ${gradeBg(report.grade)}`}
              >
                {report.grade}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {report.total_questions} questions
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                {report.correct_count ?? report.question_breakdown.filter((q) => q.is_correct).length} correct
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-500" />
                {report.answered - (report.correct_count ?? report.question_breakdown.filter((q) => q.is_correct).length)} wrong
              </span>
            </div>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              {report.recommendation}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Knowledge gaps */}
      {barData.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Knowledge Gaps</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Wrong answers per topic as a % of questions you attempted
            </p>
            <ResponsiveContainer width="100%" height={barData.length * 44 + 32}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 8, right: 48 }}
              >
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "percentage")
                      return [`${value}%`, "wrong (of attempted)"];
                    return [value, name];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(v: number) => `${v}%`}
                    style={{ fontSize: 11, fontWeight: 600, fill: "#374151" }}
                  />
                  {barData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Question breakdown */}
      <Card>
        <CardBody>
          <h2 className="font-semibold text-gray-900 mb-4">Question Breakdown</h2>
          <div className="space-y-2">
            {report.question_breakdown.map((q, i) => {
              const isExpanded = expandedQId === q.question_id;
              // prefer the exact stored score_percentage; fall back to score * 100
              const qScorePct =
                q.score_percentage != null
                  ? q.score_percentage
                  : q.score !== null
                  ? Math.round(q.score * 100)
                  : null;
              const hasWrongDetails =
                q.is_correct === false &&
                (q.detailed_explanation || q.correct_answer || q.improvement_tip);

              return (
                <div
                  key={q.question_id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 text-left transition-colors"
                    onClick={() =>
                      setExpandedQId(isExpanded ? null : q.question_id)
                    }
                  >
                    <div className="shrink-0">
                      {q.is_correct === null ? (
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-xs font-bold flex items-center justify-center text-gray-500">
                          {i + 1}
                        </div>
                      ) : q.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{q.question_text}</p>
                      {q.topic_tag && (
                        <Badge variant="indigo" className="mt-1 text-xs">
                          {q.topic_tag.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {qScorePct !== null && (
                        <span
                          className={`text-sm font-bold ${
                            qScorePct >= 70
                              ? "text-emerald-600"
                              : qScorePct >= 50
                              ? "text-amber-600"
                              : "text-red-500"
                          }`}
                        >
                          {qScorePct}%
                        </span>
                      )}
                      {(hasWrongDetails || q.is_correct !== null) &&
                        (isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ))}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      className={`px-4 pb-5 pt-3 border-t border-gray-100 text-sm ${
                        q.is_correct === false ? "bg-red-50/40" : "bg-emerald-50/30"
                      }`}
                    >
                      {/* Full question */}
                      <p className="text-gray-700 font-medium mb-3">
                        {q.question_text}
                      </p>

                      {/* Your answer */}
                      {q.student_answer && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Your answer
                          </span>
                          <p
                            className={`mt-0.5 rounded-lg px-3 py-2 text-sm ${
                              q.is_correct
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {q.student_answer}
                          </p>
                        </div>
                      )}

                      {/* Correct answer (only for wrong) */}
                      {q.is_correct === false && q.correct_answer && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Correct answer
                          </span>
                          <p className="mt-0.5 bg-emerald-100 text-emerald-800 rounded-lg px-3 py-2 text-sm">
                            {q.correct_answer}
                          </p>
                        </div>
                      )}

                      {/* Detailed explanation */}
                      {q.detailed_explanation && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Explanation
                          </span>
                          <p className="mt-0.5 text-gray-700 leading-relaxed">
                            {q.detailed_explanation}
                          </p>
                        </div>
                      )}

                      {/* Rubric breakdown */}
                      {q.rubric_feedback && q.rubric_feedback.filter((fb) => fb.comment).length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-2">
                            Rubric breakdown
                          </span>
                          <div className="space-y-2.5">
                            {q.rubric_feedback
                              .filter((fb) => fb.comment)
                              .map((fb, idx) => {
                                const pct = Math.round(fb.score * 100);
                                const barColor =
                                  fb.score >= 0.7
                                    ? "bg-emerald-500"
                                    : fb.score >= 0.5
                                    ? "bg-amber-400"
                                    : "bg-red-400";
                                const badgeColor =
                                  fb.score >= 0.7
                                    ? "bg-emerald-100 text-emerald-700"
                                    : fb.score >= 0.5
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700";
                                return (
                                  <div key={idx}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        {fb.criterion}
                                      </span>
                                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                                        {pct}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                                      <div
                                        className={`h-1.5 rounded-full ${barColor}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">{fb.comment}</p>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Improvement tip */}
                      {q.is_correct === false && q.improvement_tip && (
                        <div className="mt-3 flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 leading-relaxed">
                            <span className="font-semibold">Tip: </span>
                            {q.improvement_tip}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex gap-3 pb-8">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Button>
        <Button fullWidth onClick={() => navigate("/upload")}>
          <RefreshCw className="w-4 h-4" />
          New Quiz
        </Button>
      </div>
    </div>
  );
}
