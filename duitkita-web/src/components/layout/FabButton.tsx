"use client";

import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/app.store";

export function FabButton() {
  const openExpenseSheet = useAppStore((s) => s.openExpenseSheet);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-50">
      <div className="flex justify-center pb-safe">
        <div className="h-16 flex items-center pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={openExpenseSheet}
            className="w-14 h-14 -mt-5 rounded-full flex items-center justify-center shadow-lg transition-shadow hover:shadow-xl"
            style={{
              background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)",
              boxShadow: "0 8px 24px rgba(139, 43, 226, 0.45)",
            }}
            aria-label="Catat pengeluaran"
          >
            <Plus size={24} className="text-primary-foreground" strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
