"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryPickerProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  isLoading,
}: CategoryPickerProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 rounded-2xl shrink-0" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Belum ada kategori. Tambahkan di halaman Budget.
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((cat) => {
        const isSelected = cat.id === selectedId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl shrink-0 w-16 transition-colors",
              isSelected
                ? "bg-primary text-white"
                : "bg-slate-surface text-slate-text dark:bg-slate-800 dark:text-slate-100",
            )}
          >
            <span className="text-xl leading-none">
              {cat.icon ?? cat.name[0].toUpperCase()}
            </span>
            <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
