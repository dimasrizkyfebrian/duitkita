import { authRequest } from '@/lib/http'
import type {
  CoupleReport,
  CreateExportRequest,
  DailyReport,
  Forecast,
  HealthScore,
  MonthlyReport,
  ReportExport,
  TrendResponse,
} from '../types'

export function getMonthlyReport(year: number, month: number) {
  return authRequest<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`)
}

export function getCoupleReport(year: number, month: number) {
  return authRequest<CoupleReport>(`/reports/couple?year=${year}&month=${month}`)
}

export function getTrend(months: number) {
  return authRequest<TrendResponse>(`/reports/trend?months=${months}`)
}

export function getCoupleTrend(months: number) {
  return authRequest<TrendResponse>(`/reports/couple/trend?months=${months}`)
}

export function getDailyBreakdown(year: number, month: number) {
  return authRequest<DailyReport>(`/reports/daily?year=${year}&month=${month}`)
}

export function getCategoryTrend(categoryId: string, months: number) {
  return authRequest<TrendResponse>(
    `/reports/trend/category?category_id=${categoryId}&months=${months}`,
  )
}

export function getForecast() {
  return authRequest<Forecast>('/reports/forecast')
}

export function getHealthScore(year: number, month: number) {
  return authRequest<HealthScore>(`/reports/health-score?year=${year}&month=${month}`)
}

export function getRollover(categoryId: string, year: number, month: number) {
  return authRequest<{ rollover_amount: number }>(
    `/reports/rollover/${categoryId}?year=${year}&month=${month}`,
  )
}

export function createExport(payload: CreateExportRequest) {
  return authRequest<ReportExport>('/reports/exports', { method: 'POST', body: payload })
}

export function getExport(id: string) {
  return authRequest<ReportExport>(`/reports/exports/${id}`)
}

export function getExportDownloadUrl(id: string) {
  return authRequest<{ url: string }>(`/reports/exports/${id}/download`)
}
