import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateBudgetDto {
  @ApiPropertyOptional({ example: 2000000, description: 'Budget amount in Rupiah (integer)' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  baseAmount?: number;
}
