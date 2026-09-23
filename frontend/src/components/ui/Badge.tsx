import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "indigo" | "violet";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-ink/[0.06] text-ink-soft",
  success: "bg-right-wash text-right",
  warning: "bg-highlight-soft text-ink",
  error: "bg-marker-wash text-marker",
  indigo: "bg-pen-wash text-pen",
  violet: "bg-pen-wash text-pen",
};

export default function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
