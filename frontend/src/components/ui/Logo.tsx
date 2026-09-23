import { cn } from "../../lib/utils";

/** Wordmark: an ink tile with a highlighter tick, and the name set in the text face. */
export default function Logo({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill={invert ? "#FFFFFF" : "#1B2A4A"} />
        <path
          d="M8 17l5 5 11-12"
          fill="none"
          stroke="#FFE45C"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={cn("text-lg font-bold tracking-tight", invert ? "text-white" : "text-ink")}>
        AdaptQuiz
      </span>
    </span>
  );
}
