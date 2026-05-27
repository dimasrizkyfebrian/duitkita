import { ReportHeaderSkeleton, ReportSummarySkeleton, ReportChartSkeleton } from "@/components/features/reports/ReportSkeleton";

export default function ReportsLoading() {
  return (
    <div className="px-4 pt-6 space-y-4 pb-6">
      <ReportHeaderSkeleton />
      <ReportSummarySkeleton />
      <ReportChartSkeleton />
    </div>
  );
}
