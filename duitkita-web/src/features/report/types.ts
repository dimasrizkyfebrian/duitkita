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
