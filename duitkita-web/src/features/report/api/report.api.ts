import { authRequest } from '@/lib/http'
import type { MonthlyReport } from '../types'

export function getMonthlyReport(year: number, month: number) {
  return authRequest<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`)
}

export function getCoupleReport(year: number, month: number) {
  return authRequest<MonthlyReport>(`/reports/couple?year=${year}&month=${month}`)
}
