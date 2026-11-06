import type { Institution } from '@/features/account/types'

export interface CategorySpend {
  category_id: string
  name: string
  spent: number
  budget: number
}

export interface MonthlyReport {
  year: number
  month: number
  total_spent: number
  total_budget: number
  by_category: CategorySpend[]
}

export interface CoupleCategorySpend extends CategorySpend {
  owner: 'me' | 'partner'
}

export interface CoupleReport {
  year: number
  month: number
  my_total: number
  partner_total: number
  total_spent: number
  total_budget: number
  by_category: CoupleCategorySpend[]
}

export interface TrendPoint {
  year: number
  month: number
  total: number
}

export interface TrendResponse {
  points: TrendPoint[]
}

export interface DayPoint {
  day: number
  total: number
}

export interface DailyReport {
  year: number
  month: number
  points: DayPoint[]
}

export interface TopExpenseItem {
  expense_id: string
  category_id: string
  category_name: string
  category_icon?: string
  note?: string
  amount: number
  expense_date: string
}

export interface TopExpensesResponse {
  year: number
  month: number
  items: TopExpenseItem[]
}

/** One account's share of the month's spending. The row for expenses with
 * no account has `account_id` and `institution` null and an empty name. */
export interface AccountSpend {
  account_id: string | null
  name: string
  archived: boolean
  institution: Institution | null
  total: number
  /** Whole percentage of the month's total. */
  share: number
}

export interface AccountReport {
  year: number
  month: number
  total: number
  items: AccountSpend[]
}

export interface CoupleTopExpenseItem extends TopExpenseItem {
  owner: 'me' | 'partner'
}

export interface CoupleTopExpensesResponse {
  year: number
  month: number
  items: CoupleTopExpenseItem[]
}

export interface Forecast {
  year: number
  month: number
  projected_total: number
  confidence: number
}

export interface HealthScore {
  score: number
  grade: string
  reasons: string[]
}

export type ExportFormat = 'pdf'
export type ExportScope = 'personal' | 'couple'
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ReportExport {
  id: string
  format: ExportFormat
  year: number
  month: number
  scope: ExportScope
  status: ExportStatus
  download_url?: string
  requested_at: string
  completed_at?: string
}

export interface CreateExportRequest {
  format: ExportFormat
  year: number
  month: number
  scope: ExportScope
}
