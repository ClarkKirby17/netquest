import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/guard";
import { GAMES, hubStats, isGameSlug } from "@/lib/arcade";
import { Card } from "@/components/ui";
import GameFrame from "./GameFrame";

export default async function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireRole("student");
  const { slug } = await params;
  if (!isGameSlug(slug)) notFound();

  const stats = (await hubStats(me.userId))[slug];

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/student/arcade"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-signal)]"
      >
        <ArrowLeft size={14} /> Arcade
      </Link>

      <Card className="overflow-hidden">
        <GameFrame slug={slug} best={stats.best} scoringLeft={stats.scoringLeft} />
      </Card>

      <p className="mt-4 text-center font-[family-name:var(--font-mono-src)] text-xs text-[var(--color-muted)]">
        {GAMES[slug].name} · every run earns XP whether or not points are left today
      </p>
    </div>
  );
}
