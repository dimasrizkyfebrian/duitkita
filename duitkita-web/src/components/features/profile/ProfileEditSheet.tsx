"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Pencil, User, Mail } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "Nama tidak boleh kosong"),
  email: z.string().trim().email("Email tidak valid"),
});

export type ProfileEditFormValues = z.infer<typeof schema>;

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserType;
  onSubmit: (values: ProfileEditFormValues) => Promise<void>;
  isSubmitting: boolean;
}

interface StyledFieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

function StyledField({ id, label, icon, error, children }: StyledFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-white/45 uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
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
        {children}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function ProfileEditSheet({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting,
}: ProfileEditSheetProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileEditFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, email: user.email },
  });

  useEffect(() => {
    if (open) reset({ name: user.name, email: user.email });
  }, [open, user, reset]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto border-t border-white/[0.08] bg-[#0d0920]/98"
      >
        <div className="px-5 pt-3 pb-8 space-y-5">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/[0.12] rounded-full mx-auto" />

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Pencil size={15} className="text-purple-400" />
            </div>
            <div>
              <SheetTitle className="text-base font-semibold text-white/90">
                Edit Profil
              </SheetTitle>
              <p className="text-xs text-white/35 mt-0.5">Ubah informasi akun kamu</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <StyledField
              id="profile-name"
              label="Nama"
              icon={<User size={11} />}
              error={errors.name?.message}
            >
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <input
                    id="profile-name"
                    placeholder="Nama kamu"
                    autoComplete="name"
                    disabled={isSubmitting}
                    className="flex-1 h-11 bg-transparent px-3.5 text-sm text-white/90 placeholder:text-white/25 outline-none disabled:opacity-50"
                    {...field}
                  />
                )}
              />
            </StyledField>

            <StyledField
              id="profile-email"
              label="Email"
              icon={<Mail size={11} />}
            >
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <input
                    id="profile-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    disabled
                    className="flex-1 h-11 bg-transparent px-3.5 text-sm text-white/35 outline-none cursor-not-allowed"
                    {...field}
                  />
                )}
              />
              <span className="text-[10px] text-white/25 px-3 shrink-0">Tidak dapat diubah</span>
            </StyledField>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #db2777)",
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : null}
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
