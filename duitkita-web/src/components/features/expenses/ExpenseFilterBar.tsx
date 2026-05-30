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
            ? "text-white"
            : "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]",
        )}
        style={selectedCategoryId === null ? { background: "linear-gradient(135deg, #8b2be2, #e91e8c)" } : undefined}
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
                ? "bg-white/[0.15] text-white border border-white/[0.25]"
                : "bg-white/[0.08] text-white/60 hover:bg-white/[0.12]",
            )}
          >
            <span className="text-sm leading-none">{cat.icon ?? cat.name[0].toUpperCase()}</span>
            <span className="truncate max-w-[100px]">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
