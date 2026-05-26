import api from "@/lib/api";
import { isApiError } from "@/lib/api-envelope";
import { API_ROUTES } from "@/lib/constants";
import type { PaginatedActivity } from "@/types";

export async function fetchActivityFeed(
  limit: number,
  offset: number,
): Promise<PaginatedActivity> {
  try {
    const res = await api.get<PaginatedActivity>(API_ROUTES.activity.list, {
      params: { limit, offset },
    });
    return res.data;
  } catch (err) {
    if (isApiError(err) && err.code === "NOT_FOUND") {
      return { data: [], total: 0, limit, offset };
    }
    throw err;
  }
}
