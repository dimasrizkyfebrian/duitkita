"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { isApiError } from "@/lib/api-envelope";
import { getApiRequestId } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  const requestId = getApiRequestId(error);
  const message = isApiError(error)
    ? error.message
    : "Halaman tidak dapat dimuat. Coba lagi.";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-base font-semibold text-foreground mb-1">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {requestId && (
        <p className="text-xs text-muted-foreground mb-4 font-mono bg-muted px-2 py-1 rounded">
          ID: {requestId}
        </p>
      )}
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <Button onClick={reset} size="sm">
          Coba lagi
        </Button>
        <Link
          href="/dashboard"
          className="text-xs text-primary font-medium text-center"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
