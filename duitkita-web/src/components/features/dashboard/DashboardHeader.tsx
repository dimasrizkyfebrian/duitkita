import { getMonthName, getRemainingDays } from "@/lib/utils";

interface DashboardHeaderProps {
  userName: string;
  year: number;
  month: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Selamat pagi";
  if (hour >= 12 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function DashboardHeader({ userName, year, month }: DashboardHeaderProps) {
  const remainingDays = getRemainingDays();

  return (
    <div
      className="bg-gradient-to-br from-primary to-primary-dark h-36 px-4"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 2rem)' }}
    >
      <p className="text-primary-foreground text-lg font-semibold">
        {getGreeting()}, {userName} 👋
      </p>
      <p className="text-primary-foreground/70 text-sm mt-1">
        {getMonthName(month)} {year} · Sisa {remainingDays} hari
      </p>
    </div>
  );
}
