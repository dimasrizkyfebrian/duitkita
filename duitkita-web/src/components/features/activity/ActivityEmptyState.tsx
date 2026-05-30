import { Inbox } from "lucide-react";

export function ActivityEmptyState() {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl py-10 px-6 text-center space-y-3">
      <div className="w-12 h-12 bg-white/[0.08] rounded-full flex items-center justify-center mx-auto">
        <Inbox size={20} className="text-white/30" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/80">Belum ada aktivitas</p>
        <p className="text-xs text-white/40">
          Aktivitas berdua akan muncul di sini.
        </p>
      </div>
    </div>
  );
}
