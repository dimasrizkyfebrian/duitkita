import { useInfiniteQuery } from "@tanstack/react-query";
import { APP_CONFIG, QUERY_KEYS } from "@/lib/constants";
import { isNotFound } from "@/lib/utils";
import { fetchActivityFeed } from "@/lib/services/activity.service";

const ACTIVITY_STALE_TIME = 30_000;
import type { Activity, PaginatedActivity } from "@/types";

interface UseActivityFeedResult {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  noPartner: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  isFetching: boolean;
}

export function useActivityFeed(): UseActivityFeedResult {
  const limit = APP_CONFIG.activityPageLimit;

  const query = useInfiniteQuery<PaginatedActivity>({
    queryKey: QUERY_KEYS.activityFeed(),
    queryFn: ({ pageParam = 0 }) =>
      fetchActivityFeed(limit, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const nextOffset = last.offset + last.limit;
      return nextOffset < last.total ? nextOffset : undefined;
    },
    staleTime: ACTIVITY_STALE_TIME,
  });

  const noPartner = isNotFound(query.error);
  const activities = (query.data?.pages ?? []).flatMap((p) => p.data);

  return {
    activities,
    isLoading: query.isLoading,
    isError: query.isError && !noPartner,
    noPartner,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => query.fetchNextPage(),
    refetch: () => query.refetch(),
    isFetching: query.isFetching,
  };
}
