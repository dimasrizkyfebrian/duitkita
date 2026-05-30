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
import { DAY_NAMES } from "@/lib/utils";
import type { RecurringExpense, Category } from "@/types";

const recurringSchema = z.object({
  categoryId: z.string().min(1, "Pilih kategori"),
  amount: z
    .string()
    .min(1, "Masukkan jumlah")
    .refine(
      (v) => {
        const n = parseInt(v.replace(/\D/g, ""), 10);
        return !isNaN(n) && n >= 1000;
      },
      { message: "Minimum Rp1.000" },
    ),
  scheduleType: z.enum(["weekly", "monthly"]),
  scheduleDay: z.string().min(1, "Pilih hari"),
  note: z.string().max(255, "Maksimum 255 karakter").optional(),
});

export type RecurringFormValues = z.infer<typeof recurringSchema>;

interface RecurringFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  editingItem?: RecurringExpense | null;
  categories: Category[];
  isCategoriesLoading: boolean;
  onSubmit: (values: RecurringFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function RecurringFormSheet({
  open,
  onOpenChange,
  mode,
  editingItem,
  categories,
  isCategoriesLoading,
  onSubmit,
  isSubmitting,
}: RecurringFormSheetProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      categoryId: "",
      amount: "",
      scheduleType: "monthly",
      scheduleDay: "",
      note: "",
    },
  });

  const scheduleType = watch("scheduleType");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingItem) {
      reset({
        categoryId: editingItem.categoryId,
        amount: editingItem.amount.toLocaleString("id-ID"),
        scheduleType: editingItem.scheduleType,
        scheduleDay: String(editingItem.scheduleDay),
        note: editingItem.note ?? "",
      });
    } else {
      reset({
        categoryId: "",
        amount: "",
        scheduleType: "monthly",
        scheduleDay: "",
        note: "",
      });
    }
  }, [open, mode, editingItem, reset]);

  const isAdd = mode === "add";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto"
        style={{ background: "rgba(18, 6, 46, 0.97)" }}
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

          <div>
            <SheetTitle className="text-base font-semibold text-white">
              {isAdd ? "Tambah Pengeluaran Rutin" : "Edit Pengeluaran Rutin"}
            </SheetTitle>
            <p className="text-xs text-white/45 mt-0.5">
              {isAdd
                ? "Buat pengeluaran otomatis berulang"
                : "Ubah pengaturan pengeluaran rutin"}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Category */}
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
                              : "Pilih kategori"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
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
                  <span className="text-sm text-foreground">
                    {editingItem?.categoryName}
                  </span>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Jumlah</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Contoh: 100.000"
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
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Schedule Type */}
            <div className="space-y-1.5">
              <Label>Jadwal</Label>
              <Controller
                control={control}
                name="scheduleType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      reset((prev) => ({
                        ...prev,
                        scheduleType: val as "weekly" | "monthly",
                        scheduleDay: "",
                      }));
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Schedule Day */}
            <div className="space-y-1.5">
              <Label>
                {scheduleType === "weekly" ? "Hari" : "Tanggal"}
              </Label>
              <Controller
                control={control}
                name="scheduleDay"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue
                        placeholder={
                          scheduleType === "weekly"
                            ? "Pilih hari"
                            : "Pilih tanggal"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleType === "weekly"
                        ? DAY_NAMES.map((name, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {name}
                            </SelectItem>
                          ))
                        : Array.from({ length: 31 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {i + 1}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.scheduleDay && (
                <p className="text-xs text-destructive">
                  {errors.scheduleDay.message}
                </p>
              )}
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="note">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Controller
                control={control}
                name="note"
                render={({ field }) => (
                  <Input
                    id="note"
                    placeholder="e.g. Langganan Spotify"
                    disabled={isSubmitting}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.note && (
                <p className="text-xs text-destructive">
                  {errors.note.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isAdd ? "Tambah" : "Simpan Perubahan"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
