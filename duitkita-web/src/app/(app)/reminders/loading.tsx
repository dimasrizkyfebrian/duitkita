export default function RemindersLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-40 bg-white/[0.08] rounded-lg animate-pulse" />
          <div className="h-3 w-28 bg-white/[0.05] rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-white/[0.08] rounded-xl animate-pulse" />
      </div>
      <div className="h-10 w-64 bg-white/[0.06] rounded-2xl animate-pulse" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 space-y-2.5"
          >
            <div className="h-4 w-44 bg-white/[0.08] rounded animate-pulse" />
            <div className="h-3 w-28 bg-white/[0.06] rounded animate-pulse" />
            <div className="flex gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-7 w-20 bg-white/[0.06] rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
