import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  Trophy,
  Zap,
} from "lucide-react";
import { generateQuiz, getDocuments, getSessions } from "../lib/api";
import type { Difficulty, DocumentItem, QuizType } from "../types";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Card, { CardBody } from "../components/ui/Card";
import Spinner from "../components/ui/Spinner";
import { difficultyColor, formatDate, gradeBg, scoreToPercent } from "../lib/utils";

interface GenerateModalProps {
  doc: DocumentItem;
  onClose: () => void;
}

function GenerateModal({ doc, onClose }: GenerateModalProps) {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuizType[]>(["mcq", "short_answer"]);

  const toggleType = (t: QuizType) =>
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const mutation = useMutation({
    mutationFn: () =>
      generateQuiz({
        doc_id: doc.doc_id,
        topic: topic || undefined,
        curriculum: curriculum || undefined,
        difficulty,
        question_types: questionTypes,
        num_questions: numQuestions,
      }),
    onSuccess: (data) => navigate(`/quiz/${data.session_id}`, { state: { quiz: data } }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Generate Quiz</h2>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{doc.filename}</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic focus <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Neural networks, photosynthesis..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Curriculum <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. CBSE Grade 10, AP Biology, A-Level Physics..."
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize border transition-all ${
                    difficulty === d
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question types</label>
            <div className="flex flex-wrap gap-2">
              {(["mcq", "short_answer", "true_false", "fill_blank"] as QuizType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    questionTypes.includes(t)
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Number of questions: <span className="text-indigo-600 font-semibold">{numQuestions}</span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                ?? "Failed to generate quiz. Please try again."}
            </p>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            fullWidth
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            disabled={questionTypes.length === 0}
          >
            <Zap className="w-4 h-4" />
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  const firstName = user?.email.split("@")[0] ?? "there";
  const completedSessions = sessions.filter(
    (s) => s.answered > 0 && s.overall_score !== null
  );
  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          (completedSessions.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) /
            completedSessions.length) *
            100
        )
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          {documents.length === 0
            ? "Upload a document to get started."
            : `${documents.length} document${documents.length !== 1 ? "s" : ""} ready for quizzing.`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Documents",
            value: documents.length,
            icon: FileText,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Quizzes Taken",
            value: sessions.length,
            icon: BookOpen,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Average Score",
            value: avgScore !== null ? `${avgScore}%` : "—",
            icon: Trophy,
            color: "bg-emerald-50 text-emerald-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardBody className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/upload")}
          >
            <Plus className="w-4 h-4" />
            Upload
          </Button>
        </div>

        {docsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No documents yet</h3>
              <p className="text-sm text-gray-500 mb-5">
                Upload a PDF or text file to generate your first quiz.
              </p>
              <Button onClick={() => navigate("/upload")}>
                <Plus className="w-4 h-4" />
                Upload your first document
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.doc_id} hover>
                <CardBody>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-medium text-gray-900 truncate text-sm"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{doc.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{doc.chunks_created} chunks</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Generate Quiz
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h2>
          <Card>
            <div className="divide-y divide-gray-100">
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : (
                sessions.slice(0, 8).map((s) => (
                  <div
                    key={s.session_id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/results/${s.session_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {s.topic || "General Quiz"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={
                              s.difficulty === "easy"
                                ? "success"
                                : s.difficulty === "hard"
                                ? "error"
                                : "warning"
                            }
                            className="text-xs"
                          >
                            {s.difficulty}
                          </Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(s.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.overall_score !== null && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            {scoreToPercent(s.overall_score)}%
                          </p>
                          {s.grade && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${gradeBg(s.grade)}`}
                            >
                              {s.grade}
                            </span>
                          )}
                        </div>
                      )}
                      {s.answered === 0 && (
                        <Badge variant="warning">In progress</Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {selectedDoc && (
        <GenerateModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
