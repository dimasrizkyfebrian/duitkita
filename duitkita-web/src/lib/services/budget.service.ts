import api from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import type {
  MonthlyBudget,
  Category,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  CreateCategoryRequest,
} from "@/types";

export async function fetchBudgets(
  year: number,
  month: number,
): Promise<MonthlyBudget[]> {
  const res = await api.get<MonthlyBudget[]>(API_ROUTES.budgets.list, {
    params: { year, month },
  });
  return res.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>(API_ROUTES.categories.list);
  return res.data;
}

export async function createBudget(
  payload: CreateBudgetRequest,
): Promise<MonthlyBudget> {
  const res = await api.post<MonthlyBudget>(API_ROUTES.budgets.create, payload);
  return res.data;
}

export async function updateBudget(
  id: string,
  payload: UpdateBudgetRequest,
): Promise<MonthlyBudget> {
  const res = await api.put<MonthlyBudget>(
    API_ROUTES.budgets.update(id),
    payload,
  );
  return res.data;
}

export async function deleteBudget(id: string): Promise<void> {
  await api.delete(API_ROUTES.budgets.delete(id));
}

export async function finalizeBudgets(
  year: number,
  month: number,
): Promise<void> {
  await api.post(API_ROUTES.budgets.finalize, { year, month });
}

export async function createCategory(
  payload: CreateCategoryRequest,
): Promise<Category> {
  const res = await api.post<Category>(API_ROUTES.categories.create, payload);
  return res.data;
}

export async function updateCategory(
  id: string,
  payload: CreateCategoryRequest,
): Promise<Category> {
  const res = await api.put<Category>(
    API_ROUTES.categories.update(id),
    payload,
  );
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(API_ROUTES.categories.delete(id));
}
