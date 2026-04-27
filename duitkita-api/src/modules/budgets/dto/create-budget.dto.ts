import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsUUID, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 2025, minimum: 2024, maximum: 2100 })
  @IsInt()
  @Min(2024)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 8, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 1500000, description: 'Budget amount in Rupiah (integer)' })
  @IsInt()
  @IsPositive()
  baseAmount: number;
}
