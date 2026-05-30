"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const glassInput =
  "h-11 text-sm text-white rounded-xl border transition-all duration-200 " +
  "bg-white/[0.07] border-white/[0.12] placeholder:text-white/30 " +
  "focus-visible:bg-white/[0.10] focus-visible:border-purple-400/55 " +
  "focus-visible:ring-[3px] focus-visible:ring-purple-500/15";

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
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsPending(true);
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setAuth(
        result.user,
        result.accessToken,
        result.refreshToken,
        result.sessionId,
      );
      toast.success("Akun berhasil dibuat. Selamat datang!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      toast.error(translateRegisterError(message));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      {/* Section title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.3, ease: "easeOut" }}
        className="mb-5"
      >
        <h2 className="text-lg font-semibold text-white/95">Buat akun</h2>
        <p className="text-xs text-white/40 mt-0.5">
          Mulai kelola keuangan bersama pasangan
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Nama */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.92, duration: 0.3, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="name"
            className="text-xs font-medium text-white/60 uppercase tracking-wider"
          >
            Nama
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Nama kamu"
            autoComplete="name"
            className={glassInput}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-300/90 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-red-400/80 shrink-0" />
              {errors.name.message}
            </p>
          )}
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.3, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="email"
            className="text-xs font-medium text-white/60 uppercase tracking-wider"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="kamu@email.com"
            autoComplete="email"
            className={glassInput}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-300/90 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-red-400/80 shrink-0" />
              {errors.email.message}
            </p>
          )}
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.08, duration: 0.3, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="password"
            className="text-xs font-medium text-white/60 uppercase tracking-wider"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 karakter"
              autoComplete="new-password"
              className={`${glassInput} pr-10`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-300/90 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-red-400/80 shrink-0" />
              {errors.password.message}
            </p>
          )}
        </motion.div>

        {/* Konfirmasi Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.16, duration: 0.3, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="confirmPassword"
            className="text-xs font-medium text-white/60 uppercase tracking-wider"
          >
            Konfirmasi Password
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Ulangi password"
            autoComplete="new-password"
            className={glassInput}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-300/90 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-red-400/80 shrink-0" />
              {errors.confirmPassword.message}
            </p>
          )}
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.24, duration: 0.3, ease: "easeOut" }}
          className="pt-1"
        >
          <motion.button
            type="submit"
            disabled={isPending}
            whileTap={{ scale: isPending ? 1 : 0.97 }}
            transition={{ duration: 0.1 }}
            className="w-full h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #8b2be2 0%, #e91e8c 100%)",
              boxShadow:
                "0 4px 20px rgba(139, 43, 226, 0.4), 0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Buat Akun
                <ArrowRight size={15} />
              </>
            )}
          </motion.button>
        </motion.div>
      </form>

      {/* Link to login */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.35, duration: 0.3 }}
        className="text-center text-sm text-white/40 mt-5"
      >
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: "#e91e8c" }}
        >
          Masuk
        </Link>
      </motion.p>
    </div>
  );
}
