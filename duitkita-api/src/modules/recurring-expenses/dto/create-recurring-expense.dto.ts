import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RecurringScheduleType } from '../../../database/entities/recurring-expense.entity';

export class CreateRecurringExpenseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 150000 })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ enum: RecurringScheduleType })
  @IsEnum(RecurringScheduleType)
  scheduleType: RecurringScheduleType;

  @ApiProperty({
    description: 'Weekly: 0–6 (Sun–Sat). Monthly: 1–31.',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(31)
  scheduleDay: number;
}
