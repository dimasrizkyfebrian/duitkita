import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import { isApiError } from "@/lib/api-envelope";
import type { ErrorCode } from "@/lib/api-envelope";
import type { AlertStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isNotFound(error: unknown): boolean {
  if (isApiError(error)) return error.code === "NOT_FOUND";
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function getApiStatus(err: unknown): number | undefined {
  if (isApiError(err)) return err.status;
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

export function getApiErrorCode(err: unknown): ErrorCode | undefined {
  return isApiError(err) ? err.code : undefined;
}

export function getApiErrorMessage(err: unknown): string {
  if (isApiError(err)) return err.message;
  if (axios.isAxiosError(err)) return err.response?.data?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan";
}

export function getApiRequestId(err: unknown): string | undefined {
  return isApiError(err) ? err.requestId : undefined;
}

/**
 * Builds toast.error args that include the requestId as a description.
 * Usage: `toast.error(...apiErrorToast(err, "Fallback message"))`
 */
export function apiErrorToast(
  err: unknown,
  fallbackMessage = "Terjadi kesalahan, coba beberapa saat lagi",
): [string, { description?: string }] {
  const requestId = getApiRequestId(err);
  return [
    fallbackMessage,
    { description: requestId ? `Ref: ${requestId.slice(0, 8)}` : undefined },
  ];
}

const MIN_YEAR = 2020;

export function clampYearMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  const now = new Date();
  const maxYear = now.getFullYear() + 1;
  const y = Math.max(MIN_YEAR, Math.min(maxYear, Math.round(year)));
  const m = Math.max(1, Math.min(12, Math.round(month)));
  if (y === maxYear && m > now.getMonth() + 1) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: y, month: m };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}rb`;
  }
  return amount.toString();
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateString);
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? "";
}

export function getRemainingDays(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
}

export function getAlertColor(status: AlertStatus): string {
  switch (status) {
    case "ok":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-warning";
    case "over":
      return "text-danger";
    default:
      return "text-slate-muted";
  }
}

export function getAlertBg(status: AlertStatus): string {
  switch (status) {
    case "ok":
      return "bg-green-100 text-green-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    case "danger":
      return "bg-orange-100 text-orange-800";
    case "over":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function getAlertLabel(status: AlertStatus): string {
  switch (status) {
    case "ok":
      return "Aman";
    case "warning":
      return "Hampir habis";
    case "danger":
      return "Kritis";
    case "over":
      return "Over!";
    default:
      return "";
  }
}

export function getProgressColor(status: AlertStatus): string {
  switch (status) {
    case "ok":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "danger":
      return "bg-warning";
    case "over":
      return "bg-danger";
    default:
      return "bg-slate-surface";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function getCategoryColor(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}
