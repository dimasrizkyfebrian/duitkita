import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ maxLength: 120, example: 'Electricity bill' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 350000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiProperty({ example: '2026-05-20' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ default: 1, minimum: 0, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  remindBeforeDays?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  recurringRule?: string;
}
