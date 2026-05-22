export const RecurringMessages = {
  NOT_FOUND: 'Recurring expense not found',
  CATEGORY_NOT_BELONG_TO_USER: 'Category does not belong to your account',
  INVALID_SCHEDULE_DAY_WEEKLY: 'scheduleDay must be 0–6 for weekly schedule',
  INVALID_SCHEDULE_DAY_MONTHLY: 'scheduleDay must be 1–31 for monthly schedule',
  ALREADY_PAUSED: 'Recurring expense is already paused',
  ALREADY_ACTIVE: 'Recurring expense is already active',
} as const;
