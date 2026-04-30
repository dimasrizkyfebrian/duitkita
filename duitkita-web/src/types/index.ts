// ─────────────────────────────────────────
// Entity Types (mirror dari backend entities)
// ─────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  createdAt: string;
}

export interface MonthlyBudget {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  year: number;
  month: number;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: AlertStatus;
  isFinalized: boolean;
}

export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  monthlyBudgetId: string;
  amount: number;
  note: string | null;
  expenseDate: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  actorId: string;
  actorName: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  meta: ActivityMeta;
  createdAt: string;
}

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export type AlertStatus = "ok" | "warning" | "danger" | "over";

export type ActivityAction = "created" | "updated" | "deleted";

export type ActivityEntityType = "expense" | "budget";

// ─────────────────────────────────────────
// Meta types
// ─────────────────────────────────────────

export interface ActivityMeta {
  amount?: number;
  note?: string | null;
  categoryName?: string;
  categoryIcon?: string | null;
  expenseDate?: string;
  baseAmount?: number;
  year?: number;
  month?: number;
}

// ─────────────────────────────────────────
// Report Types
// ─────────────────────────────────────────

export interface MonthlyReport {
  userId: string;
  userName: string;
  year: number;
  month: number;
  totalBudgeted: number;
  totalRollover: number;
  totalEffectiveBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallPercentageUsed: number;
  categories: CategoryReportItem[];
}

export interface CategoryReportItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  alertStatus: AlertStatus;
  expenseCount: number;
  topExpenses: TopExpense[];
}

export interface TopExpense {
  id: string;
  amount: number;
  note: string | null;
  expenseDate: string;
}

export interface TrendItem {
  year: number;
  month: number;
  totalSpent: number;
  totalBudget: number;
  percentageUsed: number;
}

// ─────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateExpenseRequest {
  categoryId: string;
  amount: number;
  note?: string;
  expenseDate: string;
}

export interface CreateBudgetRequest {
  categoryId: string;
  year: number;
  month: number;
  baseAmount: number;
}

export interface UpdateBudgetRequest {
  baseAmount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  icon?: string;
}

export interface PaginatedActivity {
  data: Activity[];
  total: number;
  limit: number;
  offset: number;
}
