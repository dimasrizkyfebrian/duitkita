// ─────────────────────────────────────────
// Entity Types (mirror dari backend entities)
// ─────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  hasAvatar: boolean;
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

export type RecurringScheduleType = "weekly" | "monthly";

export type BillReminderStatus = "upcoming" | "overdue" | "done";

export type NotificationType =
  | "recurring_expense"
  | "bill_reminder"
  | "budget_alert"
  | "partner_activity"
  | "weekly_summary";

export type CoupleInvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired";

export type ReportExportFormat = "pdf";

export type ReportExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type SecurityAuditEventType =
  | "register_success"
  | "login_success"
  | "login_failure"
  | "password_changed"
  | "session_revoked"
  | "sessions_revoked_others"
  | "invitation_sent"
  | "invitation_accepted"
  | "invitation_rejected"
  | "invitation_cancelled"
  | "partner_linked"
  | "partner_unlinked";

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

export interface ForecastKeyDriver {
  categoryId: string;
  categoryName: string;
  shareOfSpend: number;
  totalSpent: number;
}

export interface SpendingForecast {
  year: number;
  month: number;
  scope: ReportScope;
  projectedSpent: number;
  projectedRemaining: number;
  burnRatePerDay: number;
  confidenceLevel: "low" | "medium" | "high";
  keyDrivers: ForecastKeyDriver[];
}

export interface FinancialHealthScore {
  year: number;
  month: number;
  scope: "me" | "both";
  score: number;
  savingRate: number;
  budgetAdherence: number;
  expenseVolatility: number;
  insights: string[];
}

export interface ReportExportView {
  id: string;
  format: ReportExportFormat;
  year: number;
  month: number;
  scope: string;
  status: ReportExportStatus;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadReady: boolean;
}

// ─────────────────────────────────────────
// Session / Security
// ─────────────────────────────────────────

export interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface SecurityAuditLog {
  id: string;
  eventType: SecurityAuditEventType;
  ipAddress: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedSecurityAudit {
  data: SecurityAuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// ─────────────────────────────────────────
// Recurring Expenses
// ─────────────────────────────────────────

export interface RecurringExpense {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  note: string | null;
  scheduleType: RecurringScheduleType;
  scheduleDay: number;
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateRecurringExpenseRequest {
  categoryId: string;
  amount: number;
  note?: string;
  scheduleType: RecurringScheduleType;
  scheduleDay: number;
}

export interface UpdateRecurringExpenseRequest {
  amount?: number;
  note?: string;
  scheduleType?: RecurringScheduleType;
  scheduleDay?: number;
}

export interface RunDueResult {
  processed: number;
  succeeded: number;
  failed: number;
}

// ─────────────────────────────────────────
// Bill Reminders
// ─────────────────────────────────────────

export interface BillReminder {
  id: string;
  title: string;
  amount: number | null;
  dueDate: string;
  remindBeforeDays: number;
  status: BillReminderStatus;
  snoozedUntil: string | null;
  isRecurring: boolean;
  recurringRule: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderRequest {
  title: string;
  amount?: number;
  dueDate: string;
  remindBeforeDays?: number;
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface UpdateReminderRequest {
  title?: string;
  amount?: number;
  dueDate?: string;
  remindBeforeDays?: number;
  isRecurring?: boolean;
  recurringRule?: string;
}

export interface SnoozeReminderRequest {
  snoozeDays?: number;
}

export type ReminderStatusFilter = "upcoming" | "overdue" | "done";

// ─────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payloadJson: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;
}

export interface NotificationPreferences {
  budgetAlert: boolean;
  partnerActivity: boolean;
  weeklySummary: boolean;
  reminderAlert: boolean;
  recurringAlert: boolean;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesRequest {
  budgetAlert?: boolean;
  partnerActivity?: boolean;
  weeklySummary?: boolean;
  reminderAlert?: boolean;
  recurringAlert?: boolean;
}

// ─────────────────────────────────────────
// Couple Invitations
// ─────────────────────────────────────────

export interface CoupleInvitation {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  receiverUserId: string;
  receiverName: string;
  receiverEmail: string;
  status: CoupleInvitationStatus;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────
// API Request/Response Types
// ─────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
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
  includeRollover?: boolean;
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

export interface CreateReportExportRequest {
  format?: ReportExportFormat;
  year: number;
  month: number;
  scope: "me" | "both";
}

// ─────────────────────────────────────────
// Profile / Couples
// ─────────────────────────────────────────

export interface Partner {
  id: string;
  name: string;
  email: string;
  linkedAt: string;
  hasAvatar: boolean;
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
  partnerEmail: string;
}
