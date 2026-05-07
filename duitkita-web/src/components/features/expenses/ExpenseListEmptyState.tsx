import { Receipt } from "lucide-react";

interface ExpenseListEmptyStateProps {
  variant?: "month" | "filter";
}

export function ExpenseListEmptyState({
  variant = "month",
}: ExpenseListEmptyStateProps) {
  return (
    <div className="bg-card rounded-2xl py-10 px-6 text-center space-y-3">
      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Receipt size={20} className="text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {variant === "filter"
            ? "Tidak ada hasil"
            : "Belum ada pengeluaran"}
        </p>
        <p className="text-xs text-muted-foreground">
          {variant === "filter"
            ? "Tidak ada pengeluaran untuk kategori ini bulan ini."
            : "Catat pengeluaran pertama Anda lewat tombol +"}
        </p>
      </div>
    </div>
  );
}
