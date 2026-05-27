import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  PaginatedNotifications,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest,
} from "@/types";

export async function fetchNotifications(
  limit = 50,
  offset = 0,
): Promise<PaginatedNotifications> {
  const res = await api.get<PaginatedNotifications>(
    API_ROUTES.notifications.list,
    { params: { limit, offset } },
  );
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(API_ROUTES.notifications.read(id));
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await api.patch<number>(API_ROUTES.notifications.readAll);
  return res.data;
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get<NotificationPreferences>(
    API_ROUTES.users.notificationPreferences,
  );
  return res.data;
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
  const res = await api.patch<NotificationPreferences>(
    API_ROUTES.users.notificationPreferences,
    payload,
  );
  return res.data;
}
