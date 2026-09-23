import { cn } from "../../lib/utils";

interface ProgressProps {
  value: number; // 0–100
  max?: number;
  className?: string;
  color?: "indigo" | "emerald" | "amber" | "red";
  size?: "sm" | "md";
  showLabel?: boolean;
  label?: string;
}

const colors = {
  indigo: "bg-pen",
  emerald: "bg-right",
  amber: "bg-highlight",
  red: "bg-marker",
};

const sizes = {
  sm: "h-1",
  md: "h-2",
};

export default function Progress({
  value,
  max = 100,
  className,
  color = "indigo",
  size = "md",
  showLabel = false,
  label,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && <div className="text-xs text-ink-muted mb-1">{Math.round(pct)}%</div>}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn("w-full bg-rule-soft rounded-full overflow-hidden", sizes[size])}
      >
        <div
          className={cn("rounded-full transition-all duration-500", colors[color], sizes[size])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
