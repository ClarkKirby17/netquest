import Link from "next/link";
import {
  BookOpen, Trophy, Terminal, DoorOpen, Gauge, ShieldCheck,
  BarChart3, GraduationCap, ArrowRight, Mail, MapPin,
} from "lucide-react";
import TraceHero from "@/components/landing/TraceHero";
import TeamGrid from "@/components/landing/TeamGrid";

/* Drop photos into public/team/ using these filenames. Square images
   look best — around 400x400. Any card without a photo falls back to
   initials, so the section never looks broken while you gather them. */
const TEAM = [
  { name: "Jed Neo Mirabueno", photo: "/team/jed.jpg", role: "developer" },
  { name: "Jorence Perualila", photo: "/team/jorence.jpg", role: "developer" },
  { name: "Michael John Quinones", photo: "/team/michael.jpg", role: "developer" },
  { name: "John Michael Dela Cruz", photo: "/team/john.jpg", role: "developer" },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Modules that unlock in order",
    body: "Lessons open page by page and mark themselves complete as you read. Module two stays sealed until module one is done — the server decides, not the browser.",
  },
  {
    icon: GraduationCap,
    title: "Quizzes that gate progress",
    body: "Every module ends with a quiz your instructor wrote. Pass it to move on, with attempt limits, cooldowns, and a full answer review afterwards.",
  },
  {
    icon: Terminal,
    title: "Three arcade games",
    body: "A door challenge, a packet running a congested link, and a real command-line terminal. Every run is scored and every score counts.",
  },
  {
    icon: Trophy,
    title: "XP, badges, streaks",
    body: "Level up from Cable Apprentice to Network Legend. Keep a daily streak, collect twelve badges, and hold your place on the class leaderboard.",
  },
  {
    icon: BarChart3,
    title: "Analytics instructors use",
    body: "See which lesson a class stalls on, which quiz question everyone misses, and export it all to a spreadsheet in one click.",
  },
  {
    icon: ShieldCheck,
    title: "Approved, not open",
    body: "Students register into a real class and an instructor approves them. Nobody wanders in, and every roster stays accurate.",
  },
];

const GAMES = [
  {
    icon: DoorOpen,
    name: "Door Challenge",
    line: "Three doors, one right answer. Pick correctly and the corridor takes you deeper; pick wrong and it slams.",
    tags: ["subnetting", "protocols", "devices"],
  },
  {
    icon: Gauge,
    name: "Packet Run",
    line: "You are a packet on a congested link. Jump collisions, dodge dropped frames, and see how far the wire takes you.",
    tags: ["latency", "collisions", "reflex"],
  },
  {
    icon: Terminal,
    name: "Net CLI",
    line: "A live terminal with real command syntax. Complete the mission — any valid path to the right configuration counts.",
    tags: ["ip config", "interfaces", "diagnostics"],
  },
];

const STEPS = [
  {
    k: "01",
    title: "Register into your class",
    body: "Pick your course, section, and instructor. Your instructor approves the request, so the roster is right from day one.",
  },
  {
    k: "02",
    title: "Work through the modules",
    body: "Read lessons page by page, then pass the module quiz to unlock what comes next. Points and XP accumulate as you go.",
  },
  {
    k: "03",
    title: "Play, compete, finish",
    body: "Sharpen the same skills in the arcade, climb your class leaderboard, and finish with a verifiable certificate.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative z-10">
      {/* ─────────────── nav ─────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[rgba(7,13,22,.82)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="led led-live" aria-hidden />
            <span className="font-[family-name:var(--font-display-src)] text-lg font-bold tracking-tight">
              NET<span className="text-[var(--color-signal)]">QUEST</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-6 md:flex">
            {[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["Games", "#games"],
              ["Team", "#team"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-[family-name:var(--font-mono-src)] text-xs uppercase tracking-[.14em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
            <Link href="/register" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      {/* ─────────────── hero ─────────────── */}
      <section className="mx-auto max-w-6xl px-5 pt-20 pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <span className="nq-eyebrow">
              <span className="led led-live" aria-hidden />
              gamified networking academy
            </span>

            <h1 className="mt-5 font-[family-name:var(--font-display-src)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Learn networking
              <br />
              by <span className="text-[var(--color-signal)]">playing it.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-[var(--color-muted)]">
              Guided modules that unlock as you learn. Quizzes that decide whether
              you move on. An arcade where routing a packet and configuring a
              router is the game — not a slideshow about them.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Create your account <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn btn-ghost">See how it works</a>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--color-line)] pt-6">
              {[
                ["3", "arcade games"],
                ["12", "badges"],
                ["10", "levels"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-[family-name:var(--font-display-src)] text-3xl font-bold text-[var(--color-signal)]">
                    {v}
                  </dt>
                  <dd className="font-[family-name:var(--font-mono-src)] text-[.7rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
                    {l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <TraceHero />
        </div>
      </section>

      {/* ─────────────── features ─────────────── */}
      <section id="features" className="border-t border-[var(--color-line)] bg-[var(--color-deep)]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <span className="nq-eyebrow"><span className="led led-wire" aria-hidden />what you get</span>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
            A full academy, not a quiz app
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="nq-card nq-card-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-signal-soft)] text-[var(--color-signal)]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-[1.05rem] font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── how it works ─────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <span className="nq-eyebrow"><span className="led led-wire" aria-hidden />the path</span>
        <h2 className="mt-4 font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
          Sign up to certificate
        </h2>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.k} className="nq-card relative p-6">
              <span className="font-[family-name:var(--font-mono-src)] text-sm font-bold text-[var(--color-signal)]">
                {s.k}
              </span>
              <h3 className="mt-3 text-[1.05rem] font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─────────────── games ─────────────── */}
      <section id="games" className="border-y border-[var(--color-line)] bg-[var(--color-deep)]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <span className="nq-eyebrow"><span className="led led-live" aria-hidden />the arcade</span>
          <h2 className="mt-4 max-w-2xl font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
            Three games that actually teach
          </h2>
          <p className="mt-3 max-w-xl text-[var(--color-muted)]">
            Each one runs at easy, medium, or hard. Harder difficulty multiplies
            what a run is worth.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {GAMES.map(({ icon: Icon, name, line, tags }) => (
              <article key={name} className="nq-card nq-card-hover flex flex-col p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-wire-soft)] text-[var(--color-wire)]">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-[1.05rem] font-semibold">{name}</h3>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-[var(--color-muted)]">{line}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[var(--color-line)] px-2.5 py-1 font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-wider text-[var(--color-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── team ─────────────── */}
      <section id="team" className="mx-auto max-w-6xl px-5 py-24">
        <span className="nq-eyebrow"><span className="led led-done" aria-hidden />built by</span>
        <h2 className="mt-4 font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
          The team behind NetQuest
        </h2>
        <p className="mt-3 max-w-xl text-[var(--color-muted)]">
          Four students who thought networking class deserved better than slides.
        </p>

        <TeamGrid team={TEAM} />

      </section>

      {/* ─────────────── cta ─────────────── */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-deep)]">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="font-[family-name:var(--font-display-src)] text-4xl font-bold tracking-tight">
            Ready to start?
          </h2>
          <p className="mt-3 text-[var(--color-muted)]">
            Register with your course and section. Your instructor approves it and you are in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-primary">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
            <span className="flex items-center gap-2">
              <Mail size={13} className="text-[var(--color-signal)]" />
              netquest@gmail.com
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={13} className="text-[var(--color-signal)]" />
              Valenzuela, Philippines
            </span>
          </div>
        </div>
      </section>

      {/* ─────────────── footer ─────────────── */}
      <footer className="border-t border-[var(--color-line)] bg-[var(--color-void)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-7">
          <span className="flex items-center gap-2.5">
            <span className="led led-done" aria-hidden />
            <span className="font-[family-name:var(--font-display-src)] font-bold">
              NET<span className="text-[var(--color-signal)]">QUEST</span>
            </span>
          </span>
          <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
            © {new Date().getFullYear()} · Mirabueno · Perualila · Quinones · Dela Cruz
          </span>
        </div>
      </footer>
    </div>
  );
}
