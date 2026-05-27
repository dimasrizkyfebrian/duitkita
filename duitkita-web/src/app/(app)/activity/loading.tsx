import { Skeleton } from "@/components/ui/skeleton";
import { ActivityListSkeleton } from "@/components/features/activity/ActivityListSkeleton";

export default function ActivityLoading() {
  return (
    <div className="pt-6 pb-6">
      <div className="px-4 mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <ActivityListSkeleton rows={8} />
    </div>
  );
}
