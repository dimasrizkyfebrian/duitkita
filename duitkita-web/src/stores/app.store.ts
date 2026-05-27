import { create } from "zustand";
import { clampYearMonth } from "@/lib/utils";

interface AppState {
  activeYear: number;
  activeMonth: number;
  setActiveMonth: (year: number, month: number) => void;

  isExpenseSheetOpen: boolean;
  openExpenseSheet: () => void;
  closeExpenseSheet: () => void;

  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
}

const now = new Date();

export const useAppStore = create<AppState>()((set) => ({
  activeYear: now.getFullYear(),
  activeMonth: now.getMonth() + 1,

  setActiveMonth: (year, month) => {
    const clamped = clampYearMonth(year, month);
    set({ activeYear: clamped.year, activeMonth: clamped.month });
  },

  isExpenseSheetOpen: false,
  openExpenseSheet: () => set({ isExpenseSheetOpen: true }),
  closeExpenseSheet: () =>
    set({ isExpenseSheetOpen: false, selectedCategoryId: null }),

  selectedCategoryId: null,
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
}));
