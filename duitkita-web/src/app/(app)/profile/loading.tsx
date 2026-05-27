import { Skeleton } from "@/components/ui/skeleton";

function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <div className="size-16 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-3 w-44 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-2xl" />;
}

export default function ProfileLoading() {
  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <ProfileHeaderSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
