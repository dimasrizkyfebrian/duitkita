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

export interface CoupleReport {
  year: number;
  month: number;
  me: MonthlyReport;
  partner: MonthlyReport | null;
  combinedTotalSpent: number;
  combinedTotalBudget: number;
  combinedPercentageUsed: number;
}

export interface CategoryTrend {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  trend: TrendItem[];
}

export interface RolloverHistoryItem {
  year: number;
  month: number;
  baseAmount: number;
  rolloverAmount: number;
  totalAmount: number;
  totalSpent: number;
  leftover: number;
}

export interface CategoryRolloverHistory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  months: RolloverHistoryItem[];
}

export type ReportScope = "me" | "partner" | "both";

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

export interface UpdateExpenseRequest {
  amount?: number;
  note?: string;
  expenseDate?: string;
  categoryId?: string;
}

// ─────────────────────────────────────────
// Profile / Couples
// ─────────────────────────────────────────

export interface Partner {
  id: string;
  name: string;
  email: string;
  linkedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface LinkPartnerRequest {
  code: string;
}

export interface LinkPartnerResponse {
  status: "linked" | "pending";
  partner?: Partner;
}
