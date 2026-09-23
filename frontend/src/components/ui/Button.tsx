import { forwardRef } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "ghost-invert" | "danger" | "outline" | "light";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-pen text-white hover:bg-pen-dark disabled:bg-pen/40",
  secondary:
    "bg-paper text-ink border border-rule hover:border-ink-faint disabled:text-ink-faint",
  ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink disabled:text-ink-faint",
  "ghost-invert": "text-white border border-white/40 hover:bg-white/10 disabled:text-white/40",
  danger: "bg-marker text-white hover:bg-marker/90 disabled:bg-marker/40",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.03] disabled:text-ink-faint",
  light: "bg-highlight text-ink hover:bg-highlight/85 disabled:bg-highlight/40",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-md",
  md: "text-[0.95rem] px-4 py-2.5 rounded-md",
  lg: "text-base px-6 py-3 rounded-md",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-colors disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export default Button;
