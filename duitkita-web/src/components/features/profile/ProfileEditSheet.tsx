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
import type { User } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "Nama tidak boleh kosong"),
  email: z.string().trim().email("Email tidak valid"),
});

export type ProfileEditFormValues = z.infer<typeof schema>;

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSubmit: (values: ProfileEditFormValues) => Promise<void>;
  isSubmitting: boolean;
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
        className="rounded-t-2xl p-0 max-h-[85vh] overflow-y-auto"
      >
        <div className="px-4 pt-3 pb-8 space-y-4">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto" />

          <SheetTitle className="text-base font-semibold text-foreground">
            Edit Profil
          </SheetTitle>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nama</Label>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    id="profile-name"
                    placeholder="Nama kamu"
                    autoComplete="name"
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    id="profile-email"
                    type="email"
                    inputMode="email"
                    placeholder="email@contoh.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                    {...field}
                  />
                )}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Simpan Perubahan
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
