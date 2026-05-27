import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseListSkeleton } from "@/components/features/expenses/ExpenseListSkeleton";

export default function ExpensesLoading() {
  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <ExpenseListSkeleton />
    </div>
  );
}
