export const ExpenseMessages = {
  NOT_FOUND: 'Expense not found',
  BUDGET_NOT_FOUND: 'Budget not found',
  CATEGORY_NOT_BELONG_TO_USER: 'Category not found or does not belong to you',
  FINALIZED_CREATE: 'Cannot add expenses to a finalized month',
  FINALIZED_EDIT: 'Cannot edit an expense from a finalized month',
  FINALIZED_DELETE: 'Cannot delete an expense from a finalized month',
  CROSS_MONTH:
    'Cannot move an expense to a different month. Delete this expense and create a new one in the correct month.',
  BUDGET_NOT_FOUND_FOR_MONTH: (month: number, year: number) =>
    `No budget found for this category in ${month}/${year}. Please create a budget before recording an expense.`,
  NO_PARTNER: 'No partner linked to your account',
} as const;
