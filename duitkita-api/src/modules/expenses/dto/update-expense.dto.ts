import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 90000, description: 'Expense amount in Rupiah (integer)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: 'Dinner at Sate Khas Senayan', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiPropertyOptional({ example: '2025-08-16', description: 'ISO date string (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
