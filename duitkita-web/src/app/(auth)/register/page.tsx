"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { registerUser } from "@/lib/services/auth.service";

const registerSchema = z
  .object({
    name: z.string().min(2, "Nama minimal 2 karakter"),
    email: z.string().email("Email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
  }),
};

function translateRegisterError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("email") &&
    (lower.includes("exist") ||
      lower.includes("taken") ||
      lower.includes("already"))
  )
    return "Email sudah terdaftar. Gunakan email lain.";
  return "Pendaftaran gagal. Coba lagi.";
}

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsPending(true);
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAuth(result.user, result.accessToken, result.refreshToken);
      toast.success("Akun berhasil dibuat. Selamat datang!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "";
      toast.error(translateRegisterError(message));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <motion.h2
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-xl font-bold text-white mb-6"
      >
        Daftar
      </motion.h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <motion.div
          custom={1}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label htmlFor="name" className="text-white/75 text-sm font-medium">
            Nama
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Nama kamu"
            autoComplete="name"
            className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:border-white/50 focus-visible:ring-white/15 text-sm"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-300">{errors.name.message}</p>
          )}
        </motion.div>

        <motion.div
          custom={2}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label htmlFor="email" className="text-white/75 text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="kamu@email.com"
            autoComplete="email"
            className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:border-white/50 focus-visible:ring-white/15 text-sm"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-300">{errors.email.message}</p>
          )}
        </motion.div>

        <motion.div
          custom={3}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label
            htmlFor="password"
            className="text-white/75 text-sm font-medium"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 karakter"
              autoComplete="new-password"
              className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:border-white/50 focus-visible:ring-white/15 pr-10 text-sm"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-300">{errors.password.message}</p>
          )}
        </motion.div>

        <motion.div
          custom={4}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1.5"
        >
          <Label
            htmlFor="confirmPassword"
            className="text-white/75 text-sm font-medium"
          >
            Konfirmasi Password
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Ulangi password"
            autoComplete="new-password"
            className="h-11 bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:border-white/50 focus-visible:ring-white/15 text-sm"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-300">
              {errors.confirmPassword.message}
            </p>
          )}
        </motion.div>

        <motion.div
          custom={5}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
        >
          <Button
            type="submit"
            className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm shadow-lg shadow-amber-500/30 border-0 transition-all duration-200"
            disabled={isPending}
          >
            {isPending && <Loader2 size={16} className="animate-spin mr-2" />}
            Daftar
          </Button>
        </motion.div>
      </form>

      <motion.p
        custom={6}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-center text-sm text-white/50 mt-6"
      >
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="text-amber-400 font-semibold hover:text-amber-300 transition-colors"
        >
          Masuk
        </Link>
      </motion.p>
    </div>
  );
}
