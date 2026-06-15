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
  if (grade === "A+" || grade === "A") return "text-emerald-600";
  if (grade === "B") return "text-blue-600";
  if (grade === "C") return "text-amber-600";
  return "text-red-500";
}

export function gradeBg(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (grade === "B") return "bg-blue-50 text-blue-700 border-blue-200";
  if (grade === "C") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function scoreToPercent(score: number): number {
  return Math.round(score * 100);
}

export function difficultyColor(difficulty: string): string {
  if (difficulty === "easy") return "bg-emerald-50 text-emerald-700";
  if (difficulty === "medium") return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}
