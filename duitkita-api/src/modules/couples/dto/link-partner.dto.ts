import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class LinkPartnerDto {
  @ApiProperty({ example: 'partner@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  partnerEmail: string;
}
