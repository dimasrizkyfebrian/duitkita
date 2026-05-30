"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import type { BillReminder } from "@/types";

const reminderSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(120, "Maksimal 120 karakter"),
  amount: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v.replace(/\D/g, "")), "Nominal tidak valid"),
  dueDate: z.string().min(1, "Tanggal jatuh tempo wajib diisi"),
  remindBeforeDays: z
    .string()
    .min(1, "Isi pengingat")
    .refine((v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= 30;
    }, "Rentang 0-30 hari"),
  isRecurring: z.boolean().optional(),
  recurringRule: z.string().max(64, "Maksimal 64 karakter").optional(),
});

export type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  editingItem?: BillReminder | null;
  onSubmit: (values: ReminderFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const inputClass =
  "bg-white/[0.06] border-white/[0.1] text-white/90 placeholder:text-white/30 focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 focus-visible:ring-purple-500/30 focus-visible:border-purple-500/60";

export function ReminderFormSheet({
  open,
  onOpenChange,
  mode,
  editingItem,
  onSubmit,
  isSubmitting,
}: ReminderFormSheetProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      amount: "",
      dueDate: "",
      remindBeforeDays: "1",
      isRecurring: false,
      recurringRule: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingItem) {
      reset({
        title: editingItem.title,
        amount:
          editingItem.amount !== null
            ? editingItem.amount.toLocaleString("id-ID")
            : "",
        dueDate: editingItem.dueDate,
        remindBeforeDays: String(editingItem.remindBeforeDays),
        isRecurring: editingItem.isRecurring,
        recurringRule: editingItem.recurringRule ?? "",
      });
      return;
    }
    reset({
      title: "",
      amount: "",
      dueDate: "",
      remindBeforeDays: "1",
      isRecurring: false,
      recurringRule: "",
    });
  }, [open, mode, editingItem, reset]);

  const isAdd = mode === "add";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-3xl p-0 max-h-[90vh] overflow-y-auto border-white/[0.1]"
        style={{ background: "linear-gradient(180deg, #1a0533 0%, #0f0520 100%)" }}
      >
        <div className="px-4 pt-3 pb-8 space-y-5">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/[0.15] rounded-full mx-auto" />

          {/* Header */}
          <div>
            <SheetTitle className="text-base font-semibold text-white/90">
              {isAdd ? "Tambah Pengingat Tagihan" : "Edit Pengingat Tagihan"}
            </SheetTitle>
            <p className="text-xs text-white/40 mt-0.5">
              Atur agar kamu tidak lupa bayar tagihan.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Judul */}
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium text-white/75">
                Judul
              </label>
              <Input
                id="title"
                placeholder="Contoh: Bayar listrik"
                disabled={isSubmitting}
                className={inputClass}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-400">{errors.title.message}</p>
              )}
            </div>

            {/* Nominal */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="text-sm font-medium text-white/75">
                Nominal{" "}
                <span className="text-white/35 font-normal">(opsional)</span>
              </label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <Input
                    id="amount"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Contoh: 250000"
                    disabled={isSubmitting}
                    className={inputClass}
                    value={field.value ?? ""}
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
              {errors.amount && (
                <p className="text-xs text-red-400">{errors.amount.message}</p>
              )}
            </div>

            {/* Tanggal Jatuh Tempo */}
            <div className="space-y-1.5">
              <label htmlFor="dueDate" className="text-sm font-medium text-white/75">
                Tanggal Jatuh Tempo
              </label>
              <Input
                id="dueDate"
                type="date"
                disabled={isSubmitting}
                className={inputClass}
                {...register("dueDate")}
              />
              {errors.dueDate && (
                <p className="text-xs text-red-400">{errors.dueDate.message}</p>
              )}
            </div>

            {/* Ingatkan sebelum */}
            <div className="space-y-1.5">
              <label htmlFor="remindBeforeDays" className="text-sm font-medium text-white/75">
                Ingatkan sebelum (hari)
              </label>
              <Input
                id="remindBeforeDays"
                type="number"
                min={0}
                max={30}
                disabled={isSubmitting}
                className={inputClass}
                {...register("remindBeforeDays")}
              />
              {errors.remindBeforeDays && (
                <p className="text-xs text-red-400">{errors.remindBeforeDays.message}</p>
              )}
            </div>

            {/* Aturan berulang */}
            <div className="space-y-1.5">
              <label htmlFor="recurringRule" className="text-sm font-medium text-white/75">
                Aturan berulang{" "}
                <span className="text-white/35 font-normal">(opsional)</span>
              </label>
              <Input
                id="recurringRule"
                placeholder="Contoh: tiap bulan tanggal 10"
                disabled={isSubmitting}
                className={inputClass}
                {...register("recurringRule")}
              />
              {errors.recurringRule && (
                <p className="text-xs text-red-400">{errors.recurringRule.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)", boxShadow: "0 4px 20px rgba(139,43,226,0.4)" }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isAdd ? "Tambah Pengingat" : "Simpan Perubahan"}
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
