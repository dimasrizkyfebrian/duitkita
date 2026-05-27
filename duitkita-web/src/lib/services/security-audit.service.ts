import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { PaginatedSecurityAudit } from "@/types";

export async function fetchSecurityAudit(
  limit: number,
  offset: number,
): Promise<PaginatedSecurityAudit> {
  const res = await api.get(API_ROUTES.users.securityAudit, {
    params: { limit, offset },
  });
  const payload = res.data;

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload as PaginatedSecurityAudit;
  }
  return { data: [], total: 0, limit, offset };
}
