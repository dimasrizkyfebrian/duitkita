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
