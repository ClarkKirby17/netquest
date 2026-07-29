import { Skeleton } from "@/components/ui";

/* Next renders this the instant a navigation starts, so the UI never
   looks frozen while the server works. Without it the old page just
   sits there and people click again — which queues more renders and
   makes everything slower. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[14px]" />
        ))}
      </div>

      <Skeleton className="mt-4 h-64 rounded-[14px]" />
    </div>
  );
}
