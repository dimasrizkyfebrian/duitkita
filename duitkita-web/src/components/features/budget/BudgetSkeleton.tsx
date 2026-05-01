import { Skeleton } from "@/components/ui/skeleton";

export function BudgetHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-28 h-5" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="bg-card rounded-2xl p-4 flex justify-around">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function BudgetCardSkeleton() {
  return (
    <div className="px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

export function BudgetListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2, 3].map((i) => (
        <BudgetCardSkeleton key={i} />
      ))}
    </div>
  );
}
