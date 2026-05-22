import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class MonthQueryDto {
  @ApiProperty({ example: 2025, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 8, minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class MonthsBackQueryDto {
  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 36 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  monthsBack = 6;
}
