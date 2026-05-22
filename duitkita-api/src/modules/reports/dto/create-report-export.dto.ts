import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ReportExportFormat } from '../../../database/entities/report-export.entity';
import { ReportScope } from './forecast-query.dto';

export class CreateReportExportDto {
  @ApiPropertyOptional({ enum: [ReportExportFormat.PDF], default: ReportExportFormat.PDF })
  @IsOptional()
  @IsEnum(ReportExportFormat)
  format: ReportExportFormat = ReportExportFormat.PDF;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ enum: [ReportScope.ME, ReportScope.BOTH], default: ReportScope.ME })
  @IsIn([ReportScope.ME, ReportScope.BOTH])
  scope: ReportScope.ME | ReportScope.BOTH = ReportScope.ME;
}
