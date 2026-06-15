import { Link } from "react-router-dom";
import { BookOpen, Brain, BarChart2, Sparkles, Zap } from "lucide-react";
import Button from "../components/ui/Button";

const features = [
  {
    icon: Sparkles,
    title: "AI-Generated Questions",
    desc: "GPT-4o reads your material and crafts MCQ, short-answer, true/false, and fill-in-the-blank questions automatically.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Brain,
    title: "Rubric-Based Grading",
    desc: "Every answer is scored on Accuracy, Completeness, and Terminology — partial credit, not binary right/wrong.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: BarChart2,
    title: "Knowledge Gap Analysis",
    desc: "See exactly which topics you're struggling with, ranked by frequency, with personalised revision recommendations.",
    color: "bg-emerald-50 text-emerald-600",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">AdaptQuiz</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 py-24 px-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white/90 mb-6">
            <Zap className="w-3.5 h-3.5" />
            Powered by GPT-4o + RAG
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Turn any document into
            <br />
            <span className="text-indigo-200">an adaptive quiz</span>
          </h1>
          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-10">
            Upload a PDF or text file. AdaptQuiz uses AI to generate personalised questions,
            grades your answers with rubric-based partial credit, and shows you exactly
            what to study next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg" variant="light" className="shadow-lg w-full sm:w-auto">
                Start for free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost-invert" className="w-full sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Everything you need to learn smarter
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              From upload to insights in minutes, not hours.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to study smarter?
          </h2>
          <p className="text-gray-500 mb-8">
            Create a free account and generate your first quiz in under two minutes.
          </p>
          <Link to="/register">
            <Button size="lg" className="shadow-md">
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">AdaptQuiz</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} AdaptQuiz. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
