import { Skeleton } from "@/components/ui/skeleton";

export function ActivityListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-3 w-12" />
        </li>
      ))}
    </ul>
  );
}
