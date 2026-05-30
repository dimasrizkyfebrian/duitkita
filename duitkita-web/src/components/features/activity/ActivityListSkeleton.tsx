export function ActivityListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-white/[0.08] animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-48 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-white/[0.06] rounded animate-pulse" />
          </div>
          <div className="h-3 w-10 bg-white/[0.08] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
