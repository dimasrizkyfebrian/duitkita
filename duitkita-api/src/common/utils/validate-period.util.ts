import { BadRequestException } from '@nestjs/common';

export function validateYearMonth(year: number, month: number): void {
  if (month < 1 || month > 12) {
    throw new BadRequestException('month must be between 1 and 12');
  }
  if (year < 2000 || year > 2100) {
    throw new BadRequestException('year must be between 2000 and 2100');
  }
}

export function validateMonthsBack(monthsBack: number): void {
  if (monthsBack < 1 || monthsBack > 36) {
    throw new BadRequestException('monthsBack must be between 1 and 36');
  }
}
