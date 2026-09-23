import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import { Mark } from "../ui/Mark";

/** Shared frame for sign in / sign up: the form on paper, a marked answer beside it. */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-desk flex flex-col">
      <header className="px-4 sm:px-8 h-16 flex items-center">
        <Link to="/" aria-label="AdaptQuiz home">
          <Logo />
        </Link>
      </header>

      <div className="flex-1 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 items-center max-w-6xl w-full mx-auto px-4 sm:px-8 pb-16">
        <div className="w-full max-w-md lg:justify-self-end">
          <h1 className="text-title">{title}</h1>
          <p className="text-ink-muted mt-2 mb-8">{subtitle}</p>
          <div className="sheet p-6 sm:p-8">{children}</div>
          <p className="text-ink-soft mt-6">{footer}</p>
        </div>

        <aside className="hidden lg:block max-w-sm" aria-hidden>
          <div className="sheet ruled p-7 rotate-[1.5deg]">
            <p className="text-sm text-ink-muted mb-1">Question 3, short answer</p>
            <p className="font-bold leading-8">Why does a model that overfits do badly on new data?</p>
            <p className="leading-8 text-ink-soft mt-1">
              It learns the <span className="hl text-ink">noise in the training set</span> instead of the
              general pattern, so it can’t generalise.
            </p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-sm text-ink-muted max-w-[14rem]">
                Accuracy 1.0, completeness 0.8, terminology 1.0
              </p>
              <Mark className="text-5xl">93%</Mark>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
