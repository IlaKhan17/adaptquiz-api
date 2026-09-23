import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, Plus, X } from "lucide-react";
import { generateQuiz, getDocuments, getSessions } from "../lib/api";
import type { DocumentItem } from "../types";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { Mark } from "../components/ui/Mark";
import QuizSettings, { useQuizSettings } from "../components/QuizSettings";
import { errorDetail, formatDate, scoreToPercent } from "../lib/utils";

function GenerateDialog({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const navigate = useNavigate();
  const settings = useQuizSettings();

  const mutation = useMutation({
    mutationFn: () => generateQuiz({ doc_id: doc.doc_id, ...settings.value }),
    onSuccess: (data) => navigate(`/quiz/${data.session_id}`, { state: { quiz: data } }),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mutation.isPending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4 animate-fade-in"
      onClick={() => !mutation.isPending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-title"
        className="sheet w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-rule-soft">
          <div className="min-w-0">
            <h2 id="generate-title" className="text-heading">New quiz</h2>
            <p className="text-ink-muted mt-1 truncate">From {doc.filename}</p>
          </div>
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-ink-muted hover:bg-ink/5 hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <QuizSettings settings={settings} />
          {mutation.isError && (
            <p role="alert" className="mt-5 text-sm text-marker bg-marker-wash rounded-md p-3">
              {errorDetail(mutation.error, "The quiz couldn’t be written. Try again in a moment.")}
            </p>
          )}
        </div>

        <div className="p-6 pt-0 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            fullWidth
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            disabled={!settings.isValid}
          >
            {mutation.isPending ? "Writing questions…" : "Write the quiz"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
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

  const marked = sessions.filter((s) => s.answered > 0 && s.overall_score !== null);
  const avgScore =
    marked.length > 0
      ? Math.round((marked.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / marked.length) * 100)
      : null;

  const summary =
    documents.length === 0
      ? "Add some notes to write your first quiz."
      : [
          `${documents.length} ${documents.length === 1 ? "document" : "documents"}`,
          `${sessions.length} ${sessions.length === 1 ? "quiz" : "quizzes"}`,
          avgScore !== null ? `averaging ${avgScore}%` : null,
        ]
          .filter(Boolean)
          .join(", ") + ".";

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-title">Your desk</h1>
          <p className="text-ink-soft mt-2 text-lg">{summary}</p>
        </div>
        <Button onClick={() => navigate("/upload")}>
          <Plus className="w-4 h-4" aria-hidden />
          Add notes
        </Button>
      </div>

      {/* Documents */}
      <section aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="text-heading mb-4">Notes</h2>

        {docsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : documents.length === 0 ? (
          <div className="sheet ruled px-6 py-12 sm:px-10">
            <p className="text-heading max-w-md">Nothing here yet.</p>
            <p className="mt-2 text-ink-soft max-w-md leading-8">
              Upload a PDF, Word document or text file and AdaptQuiz will write questions from it.
            </p>
            <Button className="mt-6" onClick={() => navigate("/upload")}>
              Upload your first notes
            </Button>
          </div>
        ) : (
          <ul className="sheet divide-y divide-rule-soft">
            {documents.map((doc) => (
              <li key={doc.doc_id} className="flex items-center gap-4 px-4 sm:px-6 py-4">
                <FileText className="w-5 h-5 text-ink-faint shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <p className="text-sm text-ink-muted">
                    <span className="capitalize">{doc.subject}</span>, added {formatDate(doc.created_at)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedDoc(doc)} className="shrink-0">
                  New quiz
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past quizzes */}
      {(sessionsLoading || sessions.length > 0) && (
        <section aria-labelledby="quizzes-heading">
          <h2 id="quizzes-heading" className="text-heading mb-4">Quizzes</h2>
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <ul className="sheet divide-y divide-rule-soft">
              {sessions.slice(0, 10).map((s) => {
                const unanswered = s.answered === 0;
                const pct = s.overall_score !== null ? scoreToPercent(s.overall_score) : null;
                return (
                  <li key={s.session_id}>
                    <button
                      className="w-full flex items-center gap-4 px-4 sm:px-6 py-4 text-left hover:bg-desk/60 transition-colors"
                      onClick={() => navigate(unanswered ? `/quiz/${s.session_id}` : `/results/${s.session_id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{s.topic || "Whole document"}</p>
                        <p className="text-sm text-ink-muted">
                          <span className="capitalize">{s.difficulty}</span>, {s.answered} of {s.total_questions}{" "}
                          answered, {formatDate(s.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 w-24 text-right">
                        {unanswered ? (
                          <span className="text-sm font-bold text-pen">Start</span>
                        ) : (
                          pct !== null && (
                            <Mark animate={false} tone={pct >= 70 ? "right" : "marker"} className="text-3xl">
                              {pct}%
                            </Mark>
                          )
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {selectedDoc && <GenerateDialog doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </div>
  );
}
