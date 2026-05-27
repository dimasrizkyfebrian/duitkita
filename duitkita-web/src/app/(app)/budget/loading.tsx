import { BudgetHeaderSkeleton, BudgetListSkeleton } from "@/components/features/budget/BudgetSkeleton";

export default function BudgetLoading() {
  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <BudgetHeaderSkeleton />
      <div className="bg-card rounded-2xl overflow-hidden">
        <BudgetListSkeleton />
      </div>
    </div>
  );
}
