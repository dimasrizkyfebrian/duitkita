"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

          <div>
            <SheetTitle className="text-base font-semibold text-foreground">
              {isAdd ? "Tambah Pengingat Tagihan" : "Edit Pengingat Tagihan"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Atur agar kamu tidak lupa bayar tagihan.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                placeholder="Contoh: Bayar listrik"
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Nominal <span className="text-muted-foreground">(opsional)</span>
              </Label>
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
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Tanggal Jatuh Tempo</Label>
              <Input
                id="dueDate"
                type="date"
                disabled={isSubmitting}
                {...register("dueDate")}
              />
              {errors.dueDate && (
                <p className="text-xs text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remindBeforeDays">Ingatkan sebelum (hari)</Label>
              <Input
                id="remindBeforeDays"
                type="number"
                min={0}
                max={30}
                disabled={isSubmitting}
                {...register("remindBeforeDays")}
              />
              {errors.remindBeforeDays && (
                <p className="text-xs text-destructive">
                  {errors.remindBeforeDays.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recurringRule">
                Aturan berulang <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="recurringRule"
                placeholder="Contoh: tiap bulan tanggal 10"
                disabled={isSubmitting}
                {...register("recurringRule")}
              />
              {errors.recurringRule && (
                <p className="text-xs text-destructive">
                  {errors.recurringRule.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isAdd ? "Tambah Pengingat" : "Simpan Perubahan"}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
