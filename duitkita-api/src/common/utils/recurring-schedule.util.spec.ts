import { RecurringScheduleType } from '../../database/entities/recurring-expense.entity';
import {
  advanceNextRunAt,
  computeNextRunAt,
  validateScheduleDay,
} from './recurring-schedule.util';

describe('recurring-schedule.util', () => {
  it('validates weekly and monthly schedule days', () => {
    expect(validateScheduleDay(RecurringScheduleType.WEEKLY, 0)).toBe(true);
    expect(validateScheduleDay(RecurringScheduleType.WEEKLY, 7)).toBe(false);
    expect(validateScheduleDay(RecurringScheduleType.MONTHLY, 15)).toBe(true);
    expect(validateScheduleDay(RecurringScheduleType.MONTHLY, 0)).toBe(false);
  });

  it('computes next monthly run on or after reference date', () => {
    const from = new Date(2026, 4, 10);
    const next = computeNextRunAt(RecurringScheduleType.MONTHLY, 5, from);
    expect(next.getDate()).toBe(5);
    expect(next.getMonth()).toBe(5);
  });

  it('advances to the following occurrence', () => {
    const after = new Date(2026, 4, 5);
    const next = advanceNextRunAt(RecurringScheduleType.MONTHLY, 5, after);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(5);
  });
});
