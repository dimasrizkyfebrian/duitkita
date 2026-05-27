import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  BillReminder,
  CreateReminderRequest,
  UpdateReminderRequest,
  SnoozeReminderRequest,
  ReminderStatusFilter,
} from "@/types";

export async function fetchReminders(
  status?: ReminderStatusFilter,
): Promise<BillReminder[]> {
  const res = await api.get<BillReminder[]>(API_ROUTES.reminders.list, {
    params: status ? { status } : undefined,
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchReminder(id: string): Promise<BillReminder> {
  const res = await api.get<BillReminder>(API_ROUTES.reminders.detail(id));
  return res.data;
}

export async function createReminder(
  payload: CreateReminderRequest,
): Promise<BillReminder> {
  const res = await api.post<BillReminder>(API_ROUTES.reminders.create, payload);
  return res.data;
}

export async function updateReminder(
  id: string,
  payload: UpdateReminderRequest,
): Promise<BillReminder> {
  const res = await api.patch<BillReminder>(
    API_ROUTES.reminders.update(id),
    payload,
  );
  return res.data;
}

export async function deleteReminder(id: string): Promise<void> {
  await api.delete(API_ROUTES.reminders.delete(id));
}

export async function markReminderDone(id: string): Promise<BillReminder> {
  const res = await api.post<BillReminder>(API_ROUTES.reminders.markDone(id));
  return res.data;
}

export async function snoozeReminder(
  id: string,
  payload: SnoozeReminderRequest = {},
): Promise<BillReminder> {
  const res = await api.post<BillReminder>(API_ROUTES.reminders.snooze(id), payload);
  return res.data;
}
