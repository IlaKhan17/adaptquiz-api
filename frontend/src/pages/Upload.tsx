import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Upload as UploadIcon } from "lucide-react";
import { generateQuiz, ingestDocument } from "../lib/api";
import type { IngestResponse } from "../types";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import QuizSettings, { useQuizSettings } from "../components/QuizSettings";
import { cn, errorDetail } from "../lib/utils";

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXT = /\.(pdf|txt|docx)$/i;
const MAX_MB = 20;

function isAccepted(f: File) {
  return ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.test(f.name);
}

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** The two steps of this page — a real sequence, so they're numbered. */
function Steps({ current }: { current: 1 | 2 }) {
  const items = ["Add notes", "Set up the quiz"];
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="Progress">
      {items.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
            {i > 0 && <span className="w-8 h-px bg-rule" aria-hidden />}
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                done && "bg-right text-white",
                active && "bg-ink text-white",
                !done && !active && "border border-rule text-ink-muted"
              )}
            >
              {done ? <Check className="w-3.5 h-3.5" aria-label="Done" /> : n}
            </span>
            <span className={cn("font-bold", active ? "text-ink" : "text-ink-muted")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [subject, setSubject] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ingested, setIngested] = useState<IngestResponse | null>(null);
  const settings = useQuizSettings();

  const ingestMutation = useMutation({
    mutationFn: () => ingestDocument(file!, subject.trim() || "general"),
    onSuccess: (data) => {
      setIngested(data);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const quizMutation = useMutation({
    mutationFn: () => generateQuiz({ doc_id: ingested!.doc_id, ...settings.value }),
    onSuccess: (data) => navigate(`/quiz/${data.session_id}`, { state: { quiz: data } }),
  });

  const pick = useCallback((f: File | undefined | null) => {
    setFileError("");
    ingestMutation.reset();
    if (!f) return;
    if (!isAccepted(f)) {
      setFileError("That file type isn’t supported. Use a PDF, Word (.docx) or text file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`That file is ${fmtSize(f.size)}. The limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  }, [ingestMutation]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      pick(e.dataTransfer.files[0]);
    },
    [pick]
  );

  if (ingested) {
    return (
      <div className="max-w-2xl space-y-8">
        <Steps current={2} />
        <div>
          <h1 className="text-title">Set up the quiz</h1>
          <p className="mt-2 text-ink-soft">
            <span className="font-bold text-ink">{ingested.filename}</span> is ready:{" "}
            {ingested.total_chars.toLocaleString()} characters read.
          </p>
        </div>

        <div className="sheet p-6 sm:p-8">
          <QuizSettings settings={settings} />

          {quizMutation.isError && (
            <p role="alert" className="mt-5 text-sm text-marker bg-marker-wash rounded-md p-3">
              {errorDetail(quizMutation.error, "The quiz couldn’t be written. Try again in a moment.")}
            </p>
          )}

          <Button
            fullWidth
            className="mt-8"
            size="lg"
            loading={quizMutation.isPending}
            disabled={!settings.isValid}
            onClick={() => quizMutation.mutate()}
          >
            {quizMutation.isPending ? "Writing questions…" : "Write the quiz"}
          </Button>
          {quizMutation.isPending && (
            <p className="mt-3 text-sm text-ink-muted text-center">This usually takes 10 to 20 seconds.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Steps current={1} />
      <div>
        <h1 className="text-title">Add your notes</h1>
        <p className="mt-2 text-ink-soft">
          A PDF, Word document or text file, up to {MAX_MB} MB. Scanned images of pages can’t be read.
        </p>
      </div>

      <div className="sheet p-6 sm:p-8 space-y-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-md border-2 border-dashed transition-colors focus-within:ring-2 focus-within:ring-pen focus-within:ring-offset-2",
            dragOver ? "border-pen bg-pen-wash" : file ? "border-rule bg-desk/50" : "border-rule hover:border-ink-faint"
          )}
        >
          <input
            ref={inputRef}
            id="file-input"
            type="file"
            accept=".pdf,.txt,.docx"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {file ? (
            <div className="flex items-center gap-4 p-5">
              <FileText className="w-8 h-8 text-ink-soft shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{file.name}</p>
                <p className="text-sm text-ink-muted">{fmtSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-sm font-bold text-pen hover:underline shrink-0"
                disabled={ingestMutation.isPending}
              >
                Choose another
              </button>
            </div>
          ) : (
            <label htmlFor="file-input" className="flex flex-col items-center text-center gap-3 px-6 py-12 cursor-pointer">
              <UploadIcon className="w-8 h-8 text-ink-faint" aria-hidden />
              <span>
                <span className="font-bold">Drop a file here</span>
                <span className="text-ink-soft"> or </span>
                <span className="font-bold text-pen underline underline-offset-2">choose one</span>
              </span>
              <span className="text-sm text-ink-muted">PDF, DOCX or TXT</span>
            </label>
          )}
        </div>

        {fileError && (
          <p role="alert" className="text-sm text-marker">
            {fileError}
          </p>
        )}

        <Input
          label="Subject"
          placeholder="For example, Biology"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          hint="Used to label this document on your desk."
        />

        {ingestMutation.isError && (
          <p role="alert" className="text-sm text-marker bg-marker-wash rounded-md p-3">
            {errorDetail(ingestMutation.error, "The file couldn’t be read. Check it opens normally and try again.")}
          </p>
        )}

        <div>
          <Button
            fullWidth
            size="lg"
            loading={ingestMutation.isPending}
            disabled={!file}
            onClick={() => ingestMutation.mutate()}
          >
            {ingestMutation.isPending ? "Reading your notes…" : "Upload and continue"}
          </Button>
          {ingestMutation.isPending && (
            <p className="mt-3 flex items-center justify-center gap-2 text-sm text-ink-muted">
              <Spinner size="sm" />
              Splitting it into passages and indexing them.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
