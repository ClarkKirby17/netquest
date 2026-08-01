"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Loader2 } from "lucide-react";
import { markPageRead } from "../../actions";
import { Card, Progress } from "@/components/ui";

/* One page at a time. A sentinel at the bottom of the page marks it
   read when it scrolls into view — the server still decides whether
   the advance is legal. */
export default function Reader({
  lessonId,
  moduleId,
  moduleNumber,
  moduleTitle,
  title,
  pages,
  startPage,
  completed,
  nextLessonId,
  position,
}: {
  lessonId: number;
  moduleId: number;
  moduleNumber: number;
  moduleTitle: string;
  title: string;
  pages: string[];
  startPage: number;
  completed: boolean;
  nextLessonId: number | null;
  position: { index: number; total: number };
}) {
  const [page, setPage] = useState(startPage);
  const [furthest, setFurthest] = useState(startPage);
  const [readable, setReadable] = useState(false);
  const [done, setDone] = useState(completed);
  const [moduleDone, setModuleDone] = useState(false);
  const [, startTransition] = useTransition();
  /* A separate transition for navigation so the button can show a
     pending state and refuse repeat clicks. Spamming it used to queue
     several server renders that then fought over the connection pool. */
  const [saveError, setSaveError] = useState<string | null>(null);
  /* Pages already sent to the server, so a scroll event storm cannot
     fire the same save a dozen times. */
  const savedPages = useRef<Set<number>>(new Set());
  const [navigating, startNavigation] = useTransition();
  const router = useRouter();
  const sentinel = useRef<HTMLDivElement>(null);

  const isLast = page >= pages.length - 1;
  const percent = Math.round(((page + 1) / pages.length) * 100);

  /* Reset the gate on every page turn.
     The scroll is instant, not smooth: a smooth animation was still
     running when the visibility check ran, so whether the page counted
     as read depended on animation timing. */
  useEffect(() => {
    setReadable(false);
    setSaveError(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  /* Has the reader reached the bottom of this page?
     A plain scroll measurement rather than IntersectionObserver — it
     is predictable, it survives layout shifts, and it handles the case
     where the page is shorter than the viewport (nothing to scroll, so
     it counts as read straight away). */
  useEffect(() => {
    const check = () => {
      const el = sentinel.current;
      if (!el) return;

      const fitsWithoutScrolling =
        document.documentElement.scrollHeight <= window.innerHeight + 4;
      const reachedBottom = el.getBoundingClientRect().top <= window.innerHeight - 40;

      if (fitsWithoutScrolling || reachedBottom) setReadable(true);
    };

    /* Run once after layout settles, then on every scroll and resize. */
    const id = window.setTimeout(check, 120);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [page, lessonId]);

  /* Record the page once it counts as read. Separated from detection so
     a failed save can be retried without re-scrolling, and so a slow
     save can show itself instead of failing silently. */
  const savePage = useCallback(() => {
    if (savedPages.current.has(page)) return;
    savedPages.current.add(page);
    setSaveError(null);

    startTransition(async () => {
      try {
        const res = await markPageRead(lessonId, page);
        if (!res.ok) {
          savedPages.current.delete(page);
          setSaveError("Couldn't save your progress. Tap retry.");
          return;
        }
        setFurthest((f) => Math.max(f, page));
        if (res.lessonCompleted) setDone(true);
        if (res.moduleCompleted) setModuleDone(true);
      } catch {
        savedPages.current.delete(page);
        setSaveError("Couldn't reach the server. Tap retry.");
      }
    });
  }, [lessonId, page]);

  useEffect(() => {
    if (readable) savePage();
  }, [readable, savePage]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/student/modules/${moduleId}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> Module {moduleNumber} · {moduleTitle}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2"><span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
            lesson {position.index} of {position.total}
          </span>
        </div>
        <h1 className="mt-2 font-[family-name:var(--font-display-src)] text-3xl font-bold tracking-tight">
          {title}
        </h1>
      </div>

      {/* page progress */}
      <div className="sticky top-16 z-20 -mx-1 mb-6 bg-[var(--color-void)]/85 px-1 py-3 backdrop-blur-sm">
        <Progress value={percent} label={`Page ${page + 1} of ${pages.length}`} />
      </div>

      <Card className="px-6 py-7 sm:px-9">
        <article
          className="nq-prose leading-relaxed"
          dangerouslySetInnerHTML={{ __html: pages[page] }}
        />
        <div ref={sentinel} aria-hidden className="h-px" />
      </Card>

      {/* celebrations */}
      {moduleDone && (
        <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-[rgba(0,245,160,.3)] bg-[var(--color-signal-soft)] px-5 py-4">
          <PartyPopper size={20} className="mt-0.5 shrink-0 text-[var(--color-signal)]" />
          <div>
            <p className="font-semibold text-[var(--color-signal)]">Module complete!</p>
            <p className="mt-0.5 text-sm text-[var(--color-muted)]">
              The next module just unlocked.{" "}
              <Link href="/student/modules" className="text-[var(--color-signal)] underline">
                Go see it
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border border-[rgba(255,184,77,.35)] bg-[rgba(255,184,77,.08)] px-5 py-3.5">
          <span className="flex-1 text-sm text-[var(--color-warn)]">{saveError}</span>
          <button onClick={savePage} className="btn btn-ghost px-3 py-1.5 text-[.82rem]">
            Retry
          </button>
        </div>
      )}

      {/* navigation */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={16} /> Previous
        </button>

        {!isLast ? (
          <button
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={!readable && page >= furthest}
            title={!readable && page >= furthest ? "Read to the bottom of the page first" : undefined}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next page <ArrowRight size={16} />
          </button>
        ) : done ? (
          nextLessonId ? (
            <button
              onClick={() =>
                startNavigation(() => router.push(`/student/lessons/${nextLessonId}`))
              }
              disabled={navigating}
              className="btn btn-primary disabled:opacity-70"
            >
              {navigating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </>
              ) : (
                <>
                  Next lesson <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() =>
                startNavigation(() => router.push(`/student/modules/${moduleId}`))
              }
              disabled={navigating}
              className="btn btn-primary disabled:opacity-70"
            >
              {navigating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </>
              ) : (
                <>
                  <Check size={16} /> Back to module
                </>
              )}
            </button>
          )
        ) : (
          <button
            onClick={() => setReadable(true)}
            className="btn btn-ghost"
            title="Marks this page as read"
          >
            <Check size={16} /> I&apos;ve read this page
          </button>
        )}

        {done && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm text-[var(--color-signal)]">
            <Check size={15} /> Lesson complete
          </span>
        )}
      </div>
    </div>
  );
}
