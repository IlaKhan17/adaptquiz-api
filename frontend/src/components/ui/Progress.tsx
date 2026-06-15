import { cn } from "../../lib/utils";

interface ProgressProps {
  value: number; // 0–100
  max?: number;
  className?: string;
  color?: "indigo" | "emerald" | "amber" | "red";
  size?: "sm" | "md";
  showLabel?: boolean;
}

const colors = {
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const sizes = {
  sm: "h-1.5",
  md: "h-2.5",
};

export default function Progress({
  value,
  max = 100,
  className,
  color = "indigo",
  size = "md",
  showLabel = false,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", sizes[size])}>
        <div
          className={cn("rounded-full transition-all duration-500", colors[color], sizes[size])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
