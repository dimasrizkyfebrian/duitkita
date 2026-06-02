"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  hint?: string;
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
    hint: "Minimal 8 karakter",
  },
  {
    name: "confirmPassword",
    label: "Konfirmasi password baru",
    showKey: "confirm",
    autoComplete: "new-password",
  },
];

function PasswordField({
  fieldDef,
  control,
  error,
  isSubmitting,
  visible,
  onToggleVisible,
}: {
  fieldDef: FieldDef;
  control: ReturnType<typeof useForm<ChangePasswordFormValues>>["control"];
  error?: string;
  isSubmitting: boolean;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldDef.name}
        className="text-xs font-medium text-white/45 uppercase tracking-wider flex items-center gap-1.5"
      >
        <Lock size={11} />
        {fieldDef.label}
      </label>
      <div
        className={cn(
          "flex items-center bg-white/[0.05] border rounded-xl transition-all duration-200",
          focused && !error ? "border-purple-500/50 ring-2 ring-purple-500/10" : "",
          error ? "border-red-500/50 ring-2 ring-red-500/10" : "border-white/[0.08]",
        )}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Controller
          control={control}
          name={fieldDef.name}
          render={({ field }) => (
            <input
              id={fieldDef.name}
              type={visible ? "text" : "password"}
              autoComplete={fieldDef.autoComplete}
              disabled={isSubmitting}
              placeholder="••••••••"
              className="flex-1 h-11 bg-transparent px-3.5 text-sm text-white/90 placeholder:text-white/20 outline-none disabled:opacity-50"
              {...field}
            />
          )}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          tabIndex={-1}
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
          className="px-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <Icon size={15} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : fieldDef.hint ? (
        <p className="text-xs text-white/25">{fieldDef.hint}</p>
      ) : null}
    </div>
  );
}

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

  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {FIELDS.map((f) => (
        <PasswordField
          key={f.name}
          fieldDef={f}
          control={control}
          error={errors[f.name]?.message}
          isSubmitting={isSubmitting}
          visible={show[f.showKey]}
          onToggleVisible={() => setShow((s) => ({ ...s, [f.showKey]: !s[f.showKey] }))}
        />
      ))}

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #db2777)",
          }}
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null}
          Simpan Password Baru
        </button>
      </div>
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
        className="rounded-t-2xl p-0 max-h-[90vh] overflow-y-auto border-t border-white/[0.08] bg-[#0d0920]/98"
      >
        <div className="px-5 pt-3 pb-8 space-y-5">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/[0.12] rounded-full mx-auto" />

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck size={15} className="text-purple-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-white/90">
                Ganti Password
              </SheetTitle>
              <p className="text-xs text-white/35 mt-0.5">Pastikan password baru kamu kuat</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Form remounts each time SheetContent mounts → fresh state per open. */}
          <ChangePasswordForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
