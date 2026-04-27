import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 75000, description: 'Expense amount in Rupiah (integer)' })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Lunch at Warung Padang', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @ApiProperty({ example: '2025-08-15', description: 'ISO date string (YYYY-MM-DD)' })
  @IsDateString()
  expenseDate: string;
}
