import { Receipt } from "lucide-react";

interface ExpenseListEmptyStateProps {
  variant?: "month" | "filter";
}

export function ExpenseListEmptyState({ variant = "month" }: ExpenseListEmptyStateProps) {
  return (
    <div
      className="rounded-2xl py-12 px-6 text-center space-y-3"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="w-12 h-12 bg-white/[0.08] rounded-full flex items-center justify-center mx-auto">
        <Receipt size={20} className="text-white/35" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/70">
          {variant === "filter" ? "Tidak ada hasil" : "Belum ada pengeluaran"}
        </p>
        <p className="text-xs text-white/35">
          {variant === "filter"
            ? "Tidak ada pengeluaran untuk kategori ini bulan ini."
            : "Catat pengeluaran pertama Anda lewat tombol +"}
        </p>
      </div>
    </div>
  );
}
