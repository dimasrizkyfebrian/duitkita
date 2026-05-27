import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  RecurringExpense,
  CreateRecurringExpenseRequest,
  UpdateRecurringExpenseRequest,
  RunDueResult,
} from "@/types";

export async function fetchRecurringExpenses(): Promise<RecurringExpense[]> {
  const res = await api.get<RecurringExpense[]>(
    API_ROUTES.recurringExpenses.list,
  );
  const payload = res.data;
  return Array.isArray(payload) ? payload : [];
}

export async function fetchRecurringExpense(
  id: string,
): Promise<RecurringExpense> {
  const res = await api.get<RecurringExpense>(
    API_ROUTES.recurringExpenses.detail(id),
  );
  return res.data;
}

export async function createRecurringExpense(
  payload: CreateRecurringExpenseRequest,
): Promise<RecurringExpense> {
  const res = await api.post<RecurringExpense>(
    API_ROUTES.recurringExpenses.create,
    payload,
  );
  return res.data;
}

export async function updateRecurringExpense(
  id: string,
  payload: UpdateRecurringExpenseRequest,
): Promise<RecurringExpense> {
  const res = await api.patch<RecurringExpense>(
    API_ROUTES.recurringExpenses.update(id),
    payload,
  );
  return res.data;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  await api.delete(API_ROUTES.recurringExpenses.delete(id));
}

export async function pauseRecurringExpense(
  id: string,
): Promise<RecurringExpense> {
  const res = await api.post<RecurringExpense>(
    API_ROUTES.recurringExpenses.pause(id),
  );
  return res.data;
}

export async function resumeRecurringExpense(
  id: string,
): Promise<RecurringExpense> {
  const res = await api.post<RecurringExpense>(
    API_ROUTES.recurringExpenses.resume(id),
  );
  return res.data;
}

export async function runDueRecurringExpenses(): Promise<RunDueResult> {
  const res = await api.post<RunDueResult>(API_ROUTES.recurringExpenses.runDue);
  return res.data;
}
