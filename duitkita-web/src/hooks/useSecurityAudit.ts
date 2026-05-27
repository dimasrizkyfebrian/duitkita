import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchSecurityAudit } from "@/lib/services/security-audit.service";
import type { SecurityAuditLog, PaginatedSecurityAudit } from "@/types";

const AUDIT_PAGE_SIZE = 20;

export function useSecurityAudit() {
  const query = useInfiniteQuery<PaginatedSecurityAudit>({
    queryKey: ["security-audit"],
    queryFn: ({ pageParam = 0 }) =>
      fetchSecurityAudit(AUDIT_PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const nextOffset = last.offset + last.limit;
      return nextOffset < last.total ? nextOffset : undefined;
    },
  });

  const logs: SecurityAuditLog[] = (query.data?.pages ?? []).flatMap(
    (p) => p.data,
  );

  return {
    logs,
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => query.fetchNextPage(),
  };
}
