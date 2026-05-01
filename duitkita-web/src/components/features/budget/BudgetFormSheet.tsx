"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* p-0 removes SheetContent's default padding so our wrapper div controls all spacing.
          aria-describedby suppresses Radix's missing-description warning since this is a form sheet. */}
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          {/* Handle bar */}
          <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

          {/* Title */}
          <div>
            <SheetTitle className="text-base font-semibold text-foreground">
              {isAdd ? "Tambah Anggaran" : "Edit Anggaran"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getMonthName(month)} {year}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Category field */}
            {isAdd ? (
              <div className="space-y-1.5">
                <Label>Kategori</Label>
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
                  <p className="text-xs text-destructive">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-muted/40">
                  <span className="text-base">
                    {editingBudget?.category.icon ??
                      editingBudget?.category.name[0].toUpperCase()}
                  </span>
                  <span className="text-sm text-foreground">
                    {editingBudget?.category.name}
                  </span>
                </div>
              </div>
            )}

            {/* Amount field */}
            <div className="space-y-1.5">
              <Label htmlFor="baseAmount">Jumlah Anggaran</Label>
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
                        field.onChange(
                          parseInt(raw, 10).toLocaleString("id-ID"),
                        );
                      }
                      field.onBlur();
                    }}
                  />
                )}
              />
              {errors.baseAmount && (
                <p className="text-xs text-destructive">
                  {errors.baseAmount.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isSubmitting ||
                (isAdd && availableCategories.length === 0)
              }
            >
              {isSubmitting && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {isAdd ? "Tambah Anggaran" : "Simpan Perubahan"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
