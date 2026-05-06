import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { PaginatedActivity } from "@/types";

export async function fetchActivityFeed(
  limit: number,
  offset: number,
): Promise<PaginatedActivity> {
  const res = await api.get<PaginatedActivity>(API_ROUTES.activity.list, {
    params: { limit, offset },
  });
  return res.data;
}
