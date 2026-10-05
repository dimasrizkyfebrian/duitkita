import type { CategorySpend } from '@/features/report/types'

/** A category-spend row enriched with display/action data the report
 * endpoint doesn't carry on its own: the category's icon (from `GET
 * /categories`) and, once a budget exists, its id (from `GET /budgets`,
 * needed to create an expense against it). */
export interface CategoryOverviewItem extends CategorySpend {
  icon?: string
  budgetId?: string
}
