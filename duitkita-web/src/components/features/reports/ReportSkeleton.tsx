import { Skeleton } from "@/components/ui/skeleton";

export function ReportHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-28 h-5" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function ReportSummarySkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 flex justify-around">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ReportChartSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export function ReportCategoryTrendSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="bg-card rounded-2xl px-3 py-3 flex items-center gap-3"
        >
          <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="w-20 h-6 rounded-md shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function ReportListSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
