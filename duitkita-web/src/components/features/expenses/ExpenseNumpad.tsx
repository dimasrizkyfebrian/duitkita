"use client";

import { Delete } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["000", "0", "⌫"],
] as const;

const MAX_DIGITS = 12;

interface ExpenseNumpadProps {
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
}

export function ExpenseNumpad({ value, onChange, compact = false }: ExpenseNumpadProps) {
  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "000") {
      const next = value + "000";
      if (next.length > MAX_DIGITS) return;
      onChange(next === "000" ? "0" : next);
      return;
    }
    if (value === "0" && key !== "000") {
      onChange(key);
      return;
    }
    if (value.length >= MAX_DIGITS) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={() => handleKey(key)}
          className={cn(
            "rounded-xl font-semibold flex items-center justify-center transition-colors",
            "bg-white/[0.08] text-white hover:bg-white/[0.14] active:bg-white/[0.20]",
            compact ? "h-10 text-sm" : "h-14 rounded-2xl text-lg",
            key === "⌫" && "text-red-400",
          )}
        >
          {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
        </motion.button>
      ))}
    </div>
  );
}
