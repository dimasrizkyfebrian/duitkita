import { Inbox } from "lucide-react";

export function ActivityEmptyState() {
  return (
    <div className="bg-card rounded-2xl py-10 px-6 text-center space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Inbox size={20} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Belum ada aktivitas</p>
        <p className="text-xs text-muted-foreground">
          Aktivitas berdua akan muncul di sini.
        </p>
      </div>
    </div>
  );
}
