import { Skeleton } from "@/components/ui/skeleton";

export function SummaryCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-36 mt-2" />
        <Skeleton className="h-1.5 w-full mt-3 rounded-full" />
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.05] rounded-xl px-3 py-2.5 space-y-1.5">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="bg-white/[0.05] rounded-xl px-3 py-2.5 space-y-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ActivitySectionSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BudgetListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
