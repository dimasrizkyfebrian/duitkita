"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, CreateCategoryRequest } from "@/types";

const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  icon: z.string().max(4).optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (payload: CreateCategoryRequest) => Promise<void>;
  onEdit: (id: string, payload: CreateCategoryRequest) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSubmitting: boolean;
  variant?: "default" | "glass";
}

export function CategoryManager({
  categories,
  onAdd,
  onEdit,
  onDelete,
  isSubmitting,
  variant = "default",
}: CategoryManagerProps) {
  const isGlass = variant === "glass";
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", icon: "" },
  });

  useEffect(() => {
    if (!dialogMode) return;
    if (dialogMode === "edit" && editingCategory) {
      reset({ name: editingCategory.name, icon: editingCategory.icon ?? "" });
    } else {
      reset({ name: "", icon: "" });
    }
  }, [dialogMode, editingCategory, reset]);

  async function handleFormSubmit(values: CategoryFormValues) {
    const payload: CreateCategoryRequest = {
      name: values.name,
      icon: values.icon?.trim() || undefined,
    };
    try {
      if (dialogMode === "add") {
        await onAdd(payload);
        setDialogMode(null);
      } else if (dialogMode === "edit" && editingCategory) {
        await onEdit(editingCategory.id, payload);
        setDialogMode(null);
        setEditingCategory(null);
      }
    } catch {
      // toast handled by mutation onError
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch {
      // toast handled by mutation onError
    } finally {
      setDeletingId(null);
    }
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogMode(null);
      setEditingCategory(null);
    }
  }

  return (
    <section className={isGlass ? "" : "space-y-2"}>
      {/* Header */}
      <div className={isGlass
        ? "flex items-center justify-between px-4 py-3 border-b border-white/[0.08]"
        : "flex items-center justify-between px-1"
      }>
        <h2 className={isGlass
          ? "text-xs font-semibold text-white/50 uppercase tracking-wider"
          : "text-sm font-semibold text-foreground"
        }>
          Kategori
        </h2>
        {isGlass ? (
          <button
            onClick={() => setDialogMode("add")}
            className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
          >
            <Plus size={12} />
            Tambah
          </button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setDialogMode("add")}>
            <Plus size={14} />
            Tambah
          </Button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className={isGlass
          ? "px-4 py-6 text-center"
          : "text-center py-6 bg-card rounded-2xl"
        }>
          <p className={isGlass ? "text-xs text-white/30" : "text-sm text-muted-foreground"}>
            Belum ada kategori. Tambahkan kategori terlebih dahulu.
          </p>
        </div>
      ) : (
        <ul className={isGlass
          ? "divide-y divide-white/[0.07]"
          : "bg-card rounded-2xl divide-y divide-border overflow-hidden"
        }>
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={isGlass
                ? "flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                : "flex items-center justify-between px-3 py-2.5"
              }
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={isGlass
                  ? "text-base w-8 h-8 flex items-center justify-center bg-white/[0.08] rounded-lg shrink-0"
                  : "text-lg w-9 h-9 flex items-center justify-center bg-muted rounded-xl shrink-0"
                }>
                  {cat.icon ?? cat.name[0].toUpperCase()}
                </span>
                <span className={isGlass
                  ? "text-sm font-medium text-white/80 truncate"
                  : "text-sm font-medium text-foreground truncate"
                }>
                  {cat.name}
                </span>
              </div>
              {deletingId === cat.id ? (
                <div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {isGlass ? (
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-colors">
                        <MoreVertical size={14} />
                        <span className="sr-only">Menu</span>
                      </button>
                    ) : (
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical size={14} />
                        <span className="sr-only">Menu</span>
                      </Button>
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={isGlass ? "min-w-[160px] border-white/[0.1]" : "min-w-[160px]"}
                    {...(isGlass ? { style: { background: "rgba(15, 5, 40, 0.95)", backdropFilter: "blur(20px) saturate(180%)" } } : {})}
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingCategory(cat);
                        setDialogMode("edit");
                      }}
                      className="gap-2"
                    >
                      <Pencil size={14} />
                      Edit kategori
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(cat.id)}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Trash2 size={14} />
                      Hapus kategori
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={handleDialogClose}>
        <DialogContent
          className={isGlass ? "border-white/[0.12] sm:max-w-[400px]" : undefined}
          style={isGlass ? { background: "rgba(18, 6, 46, 0.92)", backdropFilter: "blur(24px)" } : undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Tambah Kategori" : "Edit Kategori"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add"
                ? "Buat kategori baru untuk mengatur anggaran."
                : "Ubah nama atau ikon kategori ini."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Ikon (emoji, opsional)</Label>
              <Input
                id="cat-icon"
                placeholder="Contoh: 🍔"
                className={isGlass ? "focus-visible:ring-purple-500/30 focus-visible:border-purple-500/70" : undefined}
                {...register("icon")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nama Kategori</Label>
              <Input
                id="cat-name"
                placeholder="Contoh: Makanan"
                className={isGlass ? "focus-visible:ring-purple-500/30 focus-visible:border-purple-500/70" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <DialogFooter className={isGlass ? "border-t-0 bg-transparent" : undefined}>
              {isGlass ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #8b2be2, #e91e8c)" }}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {dialogMode === "add" ? "Tambah Kategori" : "Simpan Perubahan"}
                </button>
              ) : (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {dialogMode === "add" ? "Tambah Kategori" : "Simpan Perubahan"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
