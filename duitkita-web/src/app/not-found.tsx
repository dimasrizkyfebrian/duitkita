import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <Search className="w-12 h-12 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">404</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Halaman tidak ditemukan
      </p>
      <Link
        href="/dashboard"
        className="text-sm text-primary font-medium"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
