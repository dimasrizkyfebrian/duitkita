import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { MonthQueryDto } from '../../../common/dto/month-query.dto';

export enum ReportScope {
  ME = 'me',
  PARTNER = 'partner',
  BOTH = 'both',
}

export class ForecastQueryDto extends MonthQueryDto {
  @ApiPropertyOptional({ enum: ReportScope, default: ReportScope.ME })
  @IsOptional()
  @IsEnum(ReportScope)
  scope: ReportScope = ReportScope.ME;
}

export class HealthScoreQueryDto extends MonthQueryDto {
  @ApiPropertyOptional({ enum: [ReportScope.ME, ReportScope.BOTH], default: ReportScope.ME })
  @IsOptional()
  @IsIn([ReportScope.ME, ReportScope.BOTH])
  scope: ReportScope.ME | ReportScope.BOTH = ReportScope.ME;
}
