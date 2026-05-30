"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMonthName } from "@/lib/utils";
import type { MonthlyBudget, Category } from "@/types";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Pilih kategori"),
  baseAmount: z
    .string()
    .min(1, "Masukkan jumlah anggaran")
    .refine(
      (v) => {
        const n = parseInt(v.replace(/\D/g, ""), 10);
        return !isNaN(n) && n >= 1000;
      },
      { message: "Minimum Rp1.000" },
    ),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  editingBudget?: MonthlyBudget | null;
  categories: Category[];
  isCategoriesLoading: boolean;
  year: number;
  month: number;
  onSubmit: (values: BudgetFormValues) => Promise<void>;
  isSubmitting: boolean;
  budgetedCategoryIds: string[];
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isDesktop;
}

export function BudgetFormSheet({
  open,
  onOpenChange,
  mode,
  editingBudget,
  categories,
  isCategoriesLoading,
  year,
  month,
  onSubmit,
  isSubmitting,
  budgetedCategoryIds,
}: BudgetFormSheetProps) {
  const isDesktop = useIsDesktop();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { categoryId: "", baseAmount: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingBudget) {
      reset({
        categoryId: editingBudget.categoryId,
        baseAmount: editingBudget.baseAmount.toLocaleString("id-ID"),
      });
    } else {
      reset({ categoryId: "", baseAmount: "" });
    }
  }, [open, mode, editingBudget, reset]);

  const availableCategories =
    mode === "add"
      ? categories.filter((c) => !budgetedCategoryIds.includes(c.id))
      : categories;

  const isAdd = mode === "add";

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Category field */}
      {isAdd ? (
        <div className="space-y-1.5">
          <Label className={isDesktop ? "text-white/70" : undefined}>Kategori</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting || isCategoriesLoading}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue
                    placeholder={
                      isCategoriesLoading
                        ? "Memuat kategori..."
                        : availableCategories.length === 0
                          ? "Semua kategori sudah dianggarkan"
                          : "Pilih kategori"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="mr-1.5">{cat.icon ?? "📂"}</span>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className={isDesktop ? "text-white/70" : undefined}>Kategori</Label>
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-muted/40">
            <span className="text-base">
              {editingBudget?.category.icon ?? editingBudget?.category.name[0].toUpperCase()}
            </span>
            <span className="text-sm text-foreground">{editingBudget?.category.name}</span>
          </div>
        </div>
      )}

      {/* Amount field */}
      <div className="space-y-1.5">
        <Label htmlFor="baseAmount" className={isDesktop ? "text-white/70" : undefined}>
          Jumlah Anggaran
        </Label>
        <Controller
          control={control}
          name="baseAmount"
          render={({ field }) => (
            <Input
              id="baseAmount"
              type="tel"
              inputMode="numeric"
              placeholder="Contoh: 500.000"
              disabled={isSubmitting}
              value={field.value}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                field.onChange(raw);
              }}
              onBlur={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (raw) {
                  field.onChange(parseInt(raw, 10).toLocaleString("id-ID"));
                }
                field.onBlur();
              }}
            />
          )}
        />
        {errors.baseAmount && (
          <p className="text-xs text-destructive">{errors.baseAmount.message}</p>
        )}
      </div>

      {/* Submit */}
      {isDesktop ? (
        <button
          type="submit"
          disabled={isSubmitting || (isAdd && availableCategories.length === 0)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isAdd ? "Tambah Anggaran" : "Simpan Perubahan"}
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting || (isAdd && availableCategories.length === 0)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isAdd ? "Tambah Anggaran" : "Simpan Perubahan"}
        </button>
      )}
    </form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[420px] border-white/[0.12] p-0 overflow-hidden"
          style={{
            background: "rgba(18, 6, 46, 0.92)",
            backdropFilter: "blur(24px)",
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-white text-base font-semibold">
              {isAdd ? "Tambah Anggaran" : "Edit Anggaran"}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/40">
              {getMonthName(month)} {year}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4">{formContent}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
        style={{ background: "rgba(18, 6, 46, 0.97)" }}
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
          <div>
            <SheetTitle className="text-base font-semibold text-white">
              {isAdd ? "Tambah Anggaran" : "Edit Anggaran"}
            </SheetTitle>
            <p className="text-xs text-white/45 mt-0.5">
              {getMonthName(month)} {year}
            </p>
          </div>
          {formContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}
