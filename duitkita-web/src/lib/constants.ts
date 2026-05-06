export const ALERT_WARNING_THRESHOLD = 80;
export const ALERT_DANGER_THRESHOLD = 95;

export const API_ROUTES = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
  },
  users: {
    me: "/users/me",
    updateMe: "/users/me",
    changePassword: "/users/me/password",
  },
  categories: {
    list: "/categories",
    create: "/categories",
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
  },
  budgets: {
    list: "/budgets",
    create: "/budgets",
    detail: (id: string) => `/budgets/${id}`,
    update: (id: string) => `/budgets/${id}`,
    delete: (id: string) => `/budgets/${id}`,
    partner: "/budgets/partner",
    finalize: "/budgets/finalize",
  },
  expenses: {
    list: "/expenses",
    create: "/expenses",
    update: (id: string) => `/expenses/${id}`,
    delete: (id: string) => `/expenses/${id}`,
    byBudget: (budgetId: string) => `/expenses/by-budget/${budgetId}`,
    partner: "/expenses/partner",
  },
  reports: {
    monthly: "/reports/monthly",
    couple: "/reports/couple",
    trend: "/reports/trend",
    categoryTrend: "/reports/trend/category",
    rollover: (categoryId: string) => `/reports/rollover/${categoryId}`,
  },
  activity: {
    list: "/activity",
    recent: "/activity/recent",
  },
  couples: {
    link: "/couples/link",
    partner: "/couples/partner",
    unlink: "/couples/partner",
  },
} as const;

export const QUERY_KEYS = {
  budgets: (year: number, month: number) => ["budgets", year, month],
  budgetsPartner: (year: number, month: number) => [
    "budgets",
    "partner",
    year,
    month,
  ],
  budgetDetail: (id: string) => ["budgets", "detail", id],
  expenses: (year: number, month: number, categoryId?: string) =>
    ["expenses", year, month, categoryId].filter(Boolean),
  expensesPartner: (year: number, month: number, categoryId?: string) =>
    ["expenses", "partner", year, month, categoryId].filter(Boolean),
  expensesByBudget: (budgetId: string) => ["expenses", "by-budget", budgetId],
  categories: () => ["categories"],
  activity: () => ["activity"],
  activityRecent: () => ["activity", "recent"],
  activityFeed: () => ["activity", "feed"],
  reports: {
    monthly: (year: number, month: number) => [
      "reports",
      "monthly",
      year,
      month,
    ],
    couple: (year: number, month: number) => [
      "reports",
      "couple",
      year,
      month,
    ],
    trend: (monthsBack: number) => ["reports", "trend", monthsBack],
    categoryTrend: (monthsBack: number) => [
      "reports",
      "trend",
      "category",
      monthsBack,
    ],
    rollover: (categoryId: string, monthsBack: number) => [
      "reports",
      "rollover",
      categoryId,
      monthsBack,
    ],
  },
  profile: () => ["profile"],
  partner: () => ["partner"],
} as const;

export const APP_CONFIG = {
  activityRecentLimit: 3,
  activityPageLimit: 20,
  trendMonthsBack: 6,
  inviteCodeLength: 6,
} as const;
