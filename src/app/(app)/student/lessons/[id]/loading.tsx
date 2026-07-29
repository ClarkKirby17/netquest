import { Skeleton } from "@/components/ui";

export default function LoadingLesson() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-3 w-28" />
      <Skeleton className="mt-3 h-9 w-80 max-w-full" />
      <Skeleton className="mt-8 h-1.5 w-full rounded-full" />
      <div className="mt-6 space-y-3 rounded-[14px] border border-[var(--color-line)] p-7">
        {[100, 96, 88, 92, 70, 84, 60].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
