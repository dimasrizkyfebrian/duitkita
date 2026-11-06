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

/** Where the running month is heading. */
export interface CurrentMonthProjection {
  year: number
  month: number
  spent: number
  projected_total: number
  budget: number
  recurring_remaining: number
}

/** Next month (year/month) predicted from the three full months before the
 * running one, plus current_month. */
export interface Forecast {
  year: number
  month: number
  projected_total: number
  projected_low: number
  projected_high: number
  recurring_total: number
  months_with_data: number
  /** 0..1 */
  confidence: number
  current_month: CurrentMonthProjection | null
}

export type ScoreComponentKey = 'budget' | 'categories' | 'recording'

export interface ScoreComponent {
  key: ScoreComponentKey
  points: number
  max: number
}

export type ScoreTipCode =
  | 'category_over'
  | 'pace_over_budget'
  | 'recording_gap'
  | 'all_good'
  | 'no_budget'
  | 'no_records_yet'
  | 'period_not_started'

/** A code plus the numbers to phrase it; the app writes the sentence. */
export interface ScoreTip {
  code: ScoreTipCode | (string & {})
  category_name?: string
  percent?: number
  amount?: number
  budget?: number
  weeks?: number
}

export interface HealthScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'n/a'
  /** Plain English for older clients; not shown. */
  reasons: string[]
  provisional: boolean
  period: 'past' | 'current' | 'future'
  projected_spent: number
  total_budget: number
  components: ScoreComponent[]
  tips: ScoreTip[]
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
