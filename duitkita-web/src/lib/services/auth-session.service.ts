import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type { Session } from "@/types";

export async function fetchSessions(): Promise<Session[]> {
  const res = await api.get<Session[]>(API_ROUTES.auth.sessions);
  const payload = res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function revokeSession(id: string): Promise<void> {
  await api.delete(API_ROUTES.auth.session(id));
}

export async function revokeOtherSessions(): Promise<void> {
  await api.delete(API_ROUTES.auth.revokeOthers);
}
