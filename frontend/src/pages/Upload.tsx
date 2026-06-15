import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  FileText,
  Upload as UploadIcon,
  X,
  Zap,
} from "lucide-react";
import { generateQuiz, ingestDocument } from "../lib/api";
import type { Difficulty, IngestResponse, QuizType } from "../types";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card, { CardBody } from "../components/ui/Card";
import Progress from "../components/ui/Progress";

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ingested, setIngested] = useState<IngestResponse | null>(null);

  const [topic, setTopic] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionTypes, setQuestionTypes] = useState<QuizType[]>(["mcq", "short_answer"]);

  const ingestMutation = useMutation({
    mutationFn: () => ingestDocument(file!, subject || "general"),
    onSuccess: (data) => {
      setIngested(data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const quizMutation = useMutation({
    mutationFn: () =>
      generateQuiz({
        doc_id: ingested!.doc_id,
        topic: topic || undefined,
        curriculum: curriculum || undefined,
        difficulty,
        question_types: questionTypes,
        num_questions: numQuestions,
      }),
    onSuccess: (data) => navigate(`/quiz/${data.session_id}`, { state: { quiz: data } }),
  });

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type) || f.name.endsWith(".docx"))) {
      setFile(f);
    }
  }, []);

  const toggleType = (t: QuizType) =>
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  if (ingested) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Ingested</h1>
          <p className="text-gray-500 mt-1">Now configure your quiz settings.</p>
        </div>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{ingested.filename}</p>
                <p className="text-xs text-gray-400">
                  {ingested.chunks_created} chunks · {ingested.total_chars.toLocaleString()} characters
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Topic focus <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. neural networks, photosynthesis..."
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
                  Questions: <span className="text-indigo-600 font-semibold">{numQuestions}</span>
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
            </div>

            {quizMutation.isError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {(quizMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                  ?? "Quiz generation failed. Please try again."}
              </p>
            )}

            <Button
              fullWidth
              className="mt-5"
              size="lg"
              loading={quizMutation.isPending}
              disabled={questionTypes.length === 0}
              onClick={() => quizMutation.mutate()}
            >
              <Zap className="w-4 h-4" />
              Generate Quiz
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Study Material</h1>
        <p className="text-gray-500 mt-1">
          Supports PDF, DOCX, and plain-text files.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-indigo-500 bg-indigo-50"
            : file
            ? "border-indigo-300 bg-indigo-50/50"
            : "border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50"
        }`}
        onClick={() => !file && document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt,.docx"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="space-y-2">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7 text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-400">{fmtSize(file.size)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 mt-2"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
              <UploadIcon className="w-7 h-7 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Drop your file here, or{" "}
                <span className="text-indigo-600">browse</span>
              </p>
              <p className="text-sm text-gray-400 mt-1">PDF, DOCX, or TXT</p>
            </div>
          </div>
        )}
      </div>

      <Input
        label="Subject"
        placeholder="e.g. Machine Learning, History, Biology..."
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        hint="Helps organise your documents."
      />

      {ingestMutation.isPending && (
        <div className="space-y-2">
          <Progress value={60} color="indigo" />
          <p className="text-sm text-gray-500 text-center">Processing document...</p>
        </div>
      )}

      {ingestMutation.isError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 border border-red-100">
          {(ingestMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            ?? "Upload failed. Please check the file and try again."}
        </p>
      )}

      <Button
        fullWidth
        size="lg"
        loading={ingestMutation.isPending}
        disabled={!file}
        onClick={() => ingestMutation.mutate()}
      >
        <UploadIcon className="w-4 h-4" />
        Upload & Process
      </Button>
    </div>
  );
}
