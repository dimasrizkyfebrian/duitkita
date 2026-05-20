import { RecurringScheduleType } from '../../database/entities/recurring-expense.entity';

export function validateScheduleDay(
  scheduleType: RecurringScheduleType,
  scheduleDay: number,
): boolean {
  if (scheduleType === RecurringScheduleType.WEEKLY) {
    return scheduleDay >= 0 && scheduleDay <= 6;
  }
  return scheduleDay >= 1 && scheduleDay <= 31;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function clampDayOfMonth(year: number, month: number, day: number): number {
  const last = new Date(year, month, 0).getDate();
  return Math.min(day, last);
}

/** Next occurrence on or after `from` matching schedule. */
export function computeNextRunAt(
  scheduleType: RecurringScheduleType,
  scheduleDay: number,
  from: Date = new Date(),
): Date {
  const base = startOfDay(from);

  if (scheduleType === RecurringScheduleType.WEEKLY) {
    const targetDow = scheduleDay;
    const currentDow = base.getDay();
    let delta = targetDow - currentDow;
    if (delta < 0) delta += 7;
    if (delta === 0 && from > base) {
      delta = 7;
    }
    const next = new Date(base);
    next.setDate(next.getDate() + delta);
    return next;
  }

  const day = clampDayOfMonth(base.getFullYear(), base.getMonth() + 1, scheduleDay);
  let next = new Date(base.getFullYear(), base.getMonth(), day);
  if (next < startOfDay(from)) {
    const y = base.getFullYear();
    const m = base.getMonth() + 2;
    const d = clampDayOfMonth(y, m, scheduleDay);
    next = new Date(y, m - 1, d);
  }
  return next;
}

export function advanceNextRunAt(
  scheduleType: RecurringScheduleType,
  scheduleDay: number,
  after: Date,
): Date {
  const from = new Date(after);
  from.setDate(from.getDate() + 1);
  return computeNextRunAt(scheduleType, scheduleDay, from);
}

export function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
