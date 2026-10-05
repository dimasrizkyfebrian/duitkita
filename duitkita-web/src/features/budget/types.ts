export interface Budget {
  id: string
  category_id: string
  year: number
  month: number
  base_amount: number
  rollover_amount: number
  total_amount: number
  is_finalized: boolean
  created_at: string
  updated_at: string
}

export interface CreateBudgetRequest {
  category_id: string
  year: number
  month: number
  base_amount: number
}
