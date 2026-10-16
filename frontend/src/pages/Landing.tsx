import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Sparkles,
  MessageCircle,
  SlidersHorizontal,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import { formatCurrency } from "../lib/finance";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#advisor", label: "AI Advisor" },
  { href: "#simulator", label: "Simulator" },
];

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-ink">
      {/* Navbar */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <TrendingUp size={18} />
            </div>
            <span className="text-base font-semibold text-ink">BizWise AI</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-ink-secondary hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm font-medium text-ink-secondary hover:text-ink">
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Get Started
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm font-medium text-ink-secondary" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex gap-3">
                <Link to="/login" className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-medium">
                  Log in
                </Link>
                <Link to="/signup" className="flex-1 rounded-lg bg-primary py-2 text-center text-sm font-medium text-white">
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-6 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink md:text-5xl">
              Make smarter business decisions with AI.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-secondary">
              BizWise AI turns your business numbers into clear insights, practical recommendations, and smarter
              financial decisions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center rounded-lg border border-border px-6 text-sm font-semibold text-ink hover:bg-slate-50"
              >
                Explore Demo
              </a>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="mb-2 text-2xl font-semibold text-ink">Everything you need to understand your business</h2>
          <p className="mb-12 max-w-lg text-ink-secondary">
            No finance degree required — BizWise AI does the interpretation for you.
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<LineChart size={20} />}
              title="Business Health"
              description="Understand your overall financial performance at a glance, with a single health score that blends margin and cash runway."
            />
            <FeatureCard
              icon={<MessageCircle size={20} />}
              title="AI Advisor"
              description="Ask questions in plain English and get personalized advice grounded in your actual numbers, not generic tips."
            />
            <FeatureCard
              icon={<Sparkles size={20} />}
              title="Smart Insights"
              description="Automatically surface the opportunities and risks hiding in your revenue, margins, and expenses each period."
            />
            <FeatureCard
              icon={<SlidersHorizontal size={20} />}
              title="What-if Simulator"
              description="Test a price increase, a cost cut, or a slow month before it happens, and see the exact effect on profit."
            />
            <FeatureCard
              icon={<ShieldCheck size={20} />}
              title="Your data, private"
              description="Every number is scoped to your account with row-level security — nobody else can see your business data."
            />
            <FeatureCard
              icon={<TrendingUp size={20} />}
              title="Track over time"
              description="Log each period's numbers and watch your trend line, margins, and health score evolve."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="mb-12 text-2xl font-semibold text-ink">How it works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Step n={1} title="Enter your numbers" description="Revenue, costs, and cash on hand — takes about a minute per period." />
            <Step n={2} title="See your health score" description="Instantly know if you're financially healthy, at risk, or somewhere in between." />
            <Step n={3} title="Get grounded advice" description="Ask the AI advisor anything, or run a what-if scenario before you commit to a decision." />
          </div>
        </div>
      </section>

      {/* Advisor + Simulator teaser */}
      <section id="advisor" className="border-t border-border bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:px-6">
          <div>
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle size={18} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-ink">Ask your AI Advisor anything</h3>
            <p className="text-ink-secondary">
              "Am I making enough profit?" "What happens if I raise prices?" "What should I focus on next?" Your
              advisor answers using your real numbers, not boilerplate.
            </p>
          </div>
          <div id="simulator">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-ink">Simulate before you decide</h3>
            <p className="text-ink-secondary">
              Drag a slider to model a price change, a slow month, or a cost increase, and see the projected profit
              and margin impact before you act.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20 text-center">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="mb-3 text-2xl font-semibold text-ink">Start understanding your business today.</h2>
          <p className="mb-8 text-ink-secondary">Free to get started — no credit card required.</p>
          <Link
            to="/signup"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-ink-secondary md:flex-row md:px-6">
          <span>© {new Date().getFullYear()} BizWise AI</span>
          <span>Your AI-powered business decision assistant.</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-card border border-border p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-1.5 font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-secondary">{description}</p>
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
        {n}
      </div>
      <h3 className="mb-1.5 font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-secondary">{description}</p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.15)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Acme Coffee Co.</span>
        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">Healthy · 82/100</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <PreviewMetric label="Revenue" value={formatCurrency(48200)} />
        <PreviewMetric label="Expenses" value={formatCurrency(31500)} />
        <PreviewMetric label="Profit" value={formatCurrency(16700)} good />
      </div>
      <div className="mt-4 h-24 rounded-lg bg-gradient-to-t from-primary/10 to-transparent" />
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-ink">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-primary" />
        Your gross margin improved 4 points this month — mostly from lower supplier costs.
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[11px] text-ink-secondary">{label}</div>
      <div className={`text-sm font-semibold ${good ? "text-success" : "text-ink"}`}>{value}</div>
    </div>
  );
}
