export default function NotificationsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 bg-white/[0.08] rounded-lg animate-pulse" />
        <div className="h-7 w-36 bg-white/[0.06] rounded-xl animate-pulse" />
      </div>
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-2xl bg-white/[0.08] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-3.5 w-3/4 bg-white/[0.08] animate-pulse rounded" />
              <div className="h-3 w-full bg-white/[0.06] animate-pulse rounded" />
              <div className="h-2.5 w-1/5 bg-white/[0.05] animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
