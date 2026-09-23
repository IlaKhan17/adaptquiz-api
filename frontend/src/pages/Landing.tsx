import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Logo from "../components/ui/Logo";
import { Mark } from "../components/ui/Mark";

const steps = [
  {
    title: "Add your notes",
    body: "Upload a PDF, Word document or text file: lecture slides, a textbook chapter, your own revision notes.",
  },
  {
    title: "Answer questions written from them",
    body: "Choose a topic, a difficulty and your course. You get multiple choice, true or false, fill in the blank and short answer questions, all taken from what you uploaded.",
  },
  {
    title: "Get every answer marked",
    body: "Multiple choice is checked instantly. Written answers are marked for accuracy, completeness and use of terms, with partial credit, and each one comes back with an explanation.",
  },
];

/** A page from the student's notes, the question written from it, and the examiner's mark. */
function MarkedSpecimen() {
  return (
    <div className="relative" aria-label="Example of a marked answer">
      {/* The notes the question came from, tucked behind */}
      <div className="sheet absolute -top-6 -left-4 right-10 p-5 -rotate-2 hidden sm:block" aria-hidden>
        <p className="text-sm text-ink-muted mb-2">notes-week-4.pdf, page 2</p>
        <p className="text-sm leading-6 text-ink-soft">
          During the light-dependent reactions, water is split and{" "}
          <span className="hl text-ink">oxygen is released as a by-product</span>. The Calvin cycle then
          uses carbon dioxide to build glucose.
        </p>
      </div>

      <div className="sheet ruled relative sm:mt-28 p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm text-ink-muted">Question 2 of 8</p>
          <p className="text-sm text-ink-muted">Short answer</p>
        </div>
        <p className="mt-3 text-lg font-bold leading-8">
          Where does the oxygen released by photosynthesis come from?
        </p>

        <p className="mt-4 text-sm text-ink-muted">Your answer</p>
        <p className="leading-8">It comes from splitting water in the light reactions.</p>

        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-6 border-t border-rule-soft pt-4">
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-muted">Accuracy</dt>
            <dd className="font-bold tabular-nums">1.0</dd>
            <dt className="text-ink-muted">Completeness</dt>
            <dd className="font-bold tabular-nums">1.0</dd>
            <dt className="text-ink-muted">Terminology</dt>
            <dd className="font-bold tabular-nums">0.8</dd>
          </dl>
          <Mark className="text-6xl sm:text-7xl pr-2 [animation-delay:350ms]">93%</Mark>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          <span className="font-bold text-ink">To improve:</span> name the process. It’s called photolysis.
        </p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-desk text-ink">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Account">
          <Link to="/login" className="px-2 py-2 font-bold text-ink-soft hover:text-ink">
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">Create account</Button>
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-16 items-center">
          <div className="max-w-xl">
            <h1 className="text-[2.6rem] sm:text-display">
              Turn your notes into a quiz, and get every answer marked.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-[34rem]">
              Upload what you’re studying. AdaptQuiz writes questions from it, marks your answers the
              way a teacher would, with partial credit, and tells you which topics to go back to.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Make your first quiz
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-ink-muted">Free to use. Works with PDF, Word and text files.</p>
          </div>

          <MarkedSpecimen />
        </section>

        {/* How it works — a real sequence, so it's numbered */}
        <section className="bg-paper border-y border-rule">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-title max-w-lg">From a chapter to a marked quiz in about a minute</h2>
            <ol className="mt-12 grid md:grid-cols-3 gap-10 md:gap-8">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t-2 border-ink pt-5">
                  <span className="font-hand text-4xl text-marker leading-none">{i + 1}</span>
                  <h3 className="mt-2 text-heading">{s.title}</h3>
                  <p className="mt-3 text-ink-soft leading-relaxed max-w-[34ch]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Close */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="max-w-lg">
            <h2 className="text-title">Try it with the chapter you’re revising now.</h2>
            <p className="mt-3 text-ink-soft">
              You’ll see which topics you’ve got and which ones need another read.
            </p>
          </div>
          <Link to="/register">
            <Button size="lg">Make your first quiz</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Logo className="scale-90 origin-left" />
          <p className="text-sm text-ink-muted">© {new Date().getFullYear()} AdaptQuiz</p>
        </div>
      </footer>
    </div>
  );
}
