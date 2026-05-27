import { SummaryCardSkeleton, ActivitySectionSkeleton, BudgetListSkeleton } from "@/components/features/dashboard/DashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <div className="h-32 bg-primary/10" />
      <div className="px-4 -mt-8 relative z-10 space-y-4 pb-6">
        <SummaryCardSkeleton />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <ActivitySectionSkeleton />
        <BudgetListSkeleton />
      </div>
    </div>
  );
}
