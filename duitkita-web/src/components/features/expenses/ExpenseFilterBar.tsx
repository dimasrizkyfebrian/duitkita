"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface ExpenseFilterBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function ExpenseFilterBar({
  categories,
  selectedCategoryId,
  onSelect,
}: ExpenseFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-colors",
          selectedCategoryId === null
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground",
        )}
      >
        Semua
      </button>
      {categories.map((cat) => {
        const isSelected = cat.id === selectedCategoryId;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors",
              isSelected
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <span className="text-sm leading-none">
              {cat.icon ?? cat.name[0].toUpperCase()}
            </span>
            <span className="truncate max-w-[100px]">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
