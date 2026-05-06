import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  Category,
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
} from "@/types";

export async function fetchCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>(API_ROUTES.categories.list);
  return response.data;
}

export async function fetchExpenses(
  year: number,
  month: number,
  categoryId?: string,
): Promise<Expense[]> {
  const params: Record<string, string | number> = { year, month };
  if (categoryId) params.categoryId = categoryId;
  const res = await api.get<Expense[]>(API_ROUTES.expenses.list, { params });
  return res.data;
}

export async function fetchPartnerExpenses(
  year: number,
  month: number,
  categoryId?: string,
): Promise<Expense[]> {
  const params: Record<string, string | number> = { year, month };
  if (categoryId) params.categoryId = categoryId;
  const res = await api.get<Expense[]>(API_ROUTES.expenses.partner, { params });
  return res.data;
}

export async function fetchExpensesByBudget(
  budgetId: string,
): Promise<Expense[]> {
  const res = await api.get<Expense[]>(API_ROUTES.expenses.byBudget(budgetId));
  return res.data;
}

export async function createExpense(
  data: CreateExpenseRequest,
): Promise<Expense> {
  const response = await api.post<Expense>(API_ROUTES.expenses.create, data);
  return response.data;
}

export async function updateExpense(
  id: string,
  data: UpdateExpenseRequest,
): Promise<Expense> {
  const response = await api.patch<Expense>(API_ROUTES.expenses.update(id), data);
  return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(API_ROUTES.expenses.delete(id));
}
