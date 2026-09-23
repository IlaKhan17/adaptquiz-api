import { cn } from "../../lib/utils";

/**
 * The examiner's mark — handwritten in red pen, written onto the paper when an answer
 * is graded. This is the one place the design is loud; keep it that way.
 */
export function Mark({
  children,
  tone = "marker",
  className,
  animate = true,
}: {
  children: React.ReactNode;
  tone?: "marker" | "right";
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block font-hand font-bold leading-none -rotate-[5deg] select-none",
        tone === "marker" ? "text-marker" : "text-right",
        animate && "animate-mark-in",
        className
      )}
    >
      {children}
    </span>
  );
}

/** A grade circled by hand — the ring draws itself once. */
export function CircledGrade({ grade, size: sizeProp }: { grade: string; size?: number }) {
  // Letter grades sit large in the ring; "Needs Improvement" gets a wider ring and two lines
  const long = grade.length > 2;
  const size = sizeProp ?? (long ? 164 : 132);
  // An imperfect, slightly open loop, like a pen circling a mark
  const path = "M66 12 C 104 10, 124 38, 120 68 C 116 102, 86 122, 58 118 C 26 114, 8 88, 12 60 C 16 32, 40 14, 72 16";
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 132 132"
        width={size}
        height={size}
        className="absolute inset-0 overflow-visible"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke="#C8283A"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength={1}
          className="animate-draw-ring"
          style={{ strokeDasharray: 1, ["--ring-length" as string]: "1" }}
        />
      </svg>
      <Mark className={cn(long ? "text-[1.7rem] leading-[1.05] text-center max-w-[78%]" : "text-7xl")}>
        {grade}
      </Mark>
    </span>
  );
}
