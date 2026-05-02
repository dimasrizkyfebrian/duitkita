"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan password saat ini"),
    newPassword: z.string().min(8, "Minimum 8 karakter"),
    confirmPassword: z.string().min(1, "Konfirmasi password baru"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi tidak cocok",
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Password baru harus berbeda",
  });

export type ChangePasswordFormValues = z.infer<typeof schema>;

interface ChangePasswordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ChangePasswordFormValues) => Promise<void>;
  isSubmitting: boolean;
}

interface FieldDef {
  name: keyof ChangePasswordFormValues;
  label: string;
  showKey: "current" | "next" | "confirm";
  autoComplete: string;
}

const FIELDS: FieldDef[] = [
  {
    name: "currentPassword",
    label: "Password saat ini",
    showKey: "current",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "Password baru",
    showKey: "next",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Konfirmasi password baru",
    showKey: "confirm",
    autoComplete: "new-password",
  },
];

function ChangePasswordForm({
  onSubmit,
  isSubmitting,
}: Pick<ChangePasswordSheetProps, "onSubmit" | "isSubmitting">) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {FIELDS.map((f) => {
        const visible = show[f.showKey];
        const Icon = visible ? EyeOff : Eye;
        return (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <div className="relative">
              <Controller
                control={control}
                name={f.name}
                render={({ field }) => (
                  <Input
                    id={f.name}
                    type={visible ? "text" : "password"}
                    autoComplete={f.autoComplete}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...field}
                  />
                )}
              />
              <button
                type="button"
                onClick={() =>
                  setShow((s) => ({ ...s, [f.showKey]: !s[f.showKey] }))
                }
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground",
                )}
                aria-label={visible ? "Sembunyikan" : "Tampilkan"}
              >
                <Icon size={16} />
              </button>
            </div>
            {errors[f.name] && (
              <p className="text-xs text-destructive">
                {errors[f.name]?.message}
              </p>
            )}
          </div>
        );
      })}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 size={14} className="animate-spin" />}
        Simpan Password Baru
      </Button>
    </form>
  );
}

export function ChangePasswordSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: ChangePasswordSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

          <SheetTitle className="text-base font-semibold text-foreground">
            Ganti Password
          </SheetTitle>

          {/* Form remounts each time SheetContent mounts -> fresh state per open. */}
          <ChangePasswordForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
