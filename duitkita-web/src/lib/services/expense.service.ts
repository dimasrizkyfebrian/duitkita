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
