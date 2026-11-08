import type { IncomeSource } from '../types'

export const INCOME_SOURCES: { value: IncomeSource; label: string }[] = [
  { value: 'salary', label: 'Gaji' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'gift', label: 'Hadiah' },
  { value: 'investment', label: 'Investasi' },
  { value: 'other', label: 'Lainnya' },
]

/** A source's label; a code this build doesn't know shows as "Lainnya". */
export function incomeSourceLabel(source: string): string {
  return INCOME_SOURCES.find((s) => s.value === source)?.label ?? 'Lainnya'
}
