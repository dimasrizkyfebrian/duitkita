import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurringScheduleType } from '../../../database/entities/recurring-expense.entity';

export class UpdateRecurringExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ enum: RecurringScheduleType })
  @IsOptional()
  @IsEnum(RecurringScheduleType)
  scheduleType?: RecurringScheduleType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(31)
  scheduleDay?: number;
}
