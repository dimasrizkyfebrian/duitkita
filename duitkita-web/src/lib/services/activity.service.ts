import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { PaginatedActivity } from "@/types";
import axios from "axios";

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
    // 404 = no partner linked yet — treat as empty, not an error
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { data: [], total: 0, limit, offset };
    }
    throw err;
  }
}
