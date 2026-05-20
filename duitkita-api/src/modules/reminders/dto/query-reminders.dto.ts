import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BillReminderStatus } from '../../../database/entities/bill-reminder.entity';

export class QueryRemindersDto {
  @ApiPropertyOptional({ enum: BillReminderStatus })
  @IsOptional()
  @IsEnum(BillReminderStatus)
  status?: BillReminderStatus;
}
