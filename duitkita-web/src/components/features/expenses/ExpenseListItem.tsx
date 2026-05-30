"use client";

import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrencyShort } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseListItemProps {
  expense: Expense;
  showActions: boolean;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
}

export const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function ExpenseListItem({
  expense,
  showActions,
  onEdit,
  onDelete,
}: ExpenseListItemProps) {
  return (
    <motion.li
      variants={itemVariants}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span className="text-base w-9 h-9 flex items-center justify-center bg-white/[0.08] rounded-xl shrink-0">
        {expense.category.icon ?? expense.category.name[0].toUpperCase()}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {expense.category.name}
        </p>
        {expense.note && (
          <p className="text-xs text-white/45 truncate">
            {expense.note}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <p className="text-sm font-semibold text-white tabular-nums">
          {formatCurrencyShort(expense.amount)}
        </p>
        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <MoreVertical size={14} />
                <span className="sr-only">Menu</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[140px] border-white/[0.1]"
              style={{ background: "rgba(15, 5, 40, 0.95)", backdropFilter: "blur(20px) saturate(180%)" }}
            >
              <DropdownMenuItem
                onClick={() => onEdit?.(expense)}
                className="gap-2"
              >
                <Pencil size={14} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(expense)}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 size={14} />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.li>
  );
}
