export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function gradeColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "text-right";
  if (grade === "B" || grade === "C") return "text-ink";
  return "text-marker";
}

export function gradeBg(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-right-wash text-right border-right/20";
  if (grade === "B" || grade === "C") return "bg-ink/[0.05] text-ink border-ink/10";
  return "bg-marker-wash text-marker border-marker/20";
}

export function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}

export function difficultyColor(difficulty: string): string {
  if (difficulty === "easy") return "bg-right-wash text-right";
  if (difficulty === "medium") return "bg-highlight-soft text-ink";
  return "bg-marker-wash text-marker";
}

/** Human names for question formats, used everywhere they're shown. */
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple choice",
  short_answer: "Short answer",
  true_false: "True or false",
  fill_blank: "Fill in the blank",
};

export function errorDetail(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" && detail ? detail : fallback;
}
