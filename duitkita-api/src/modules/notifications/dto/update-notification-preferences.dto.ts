import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  budgetAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  partnerActivity?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reminderAlert?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  recurringAlert?: boolean;
}
