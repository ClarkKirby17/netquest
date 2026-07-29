"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, PartyPopper, Loader2 } from "lucide-react";
import { markPageRead } from "../../actions";
import { Card, Progress, Led } from "@/components/ui";

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
  const [navigating, startNavigation] = useTransition();
  const router = useRouter();
  const sentinel = useRef<HTMLDivElement>(null);

  const isLast = page >= pages.length - 1;
  const percent = Math.round(((page + 1) / pages.length) * 100);

  /* Reset the gate on every page turn. */
  useEffect(() => {
    setReadable(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  /* When the end of the page becomes visible, the page counts as read. */
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReadable(true);
        startTransition(async () => {
          const res = await markPageRead(lessonId, page);
          if (res.ok) {
            setFurthest((f) => Math.max(f, page));
            if (res.lessonCompleted) setDone(true);
            if (res.moduleCompleted) setModuleDone(true);
          }
        });
        io.disconnect();
      },
      { rootMargin: "0px 0px -80px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [lessonId, page]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/student/modules/${moduleId}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> Module {moduleNumber} · {moduleTitle}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Led state={done ? "done" : "live"} />
          <span className="font-[family-name:var(--font-mono-src)] text-[.68rem] uppercase tracking-[.14em] text-[var(--color-muted)]">
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
          <span className="font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
            scroll to the end to finish
          </span>
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
