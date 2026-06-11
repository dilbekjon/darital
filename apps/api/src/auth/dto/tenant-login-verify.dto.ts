import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class TenantLoginVerifyDto {
  @ApiProperty({ description: 'Tenant phone number (contact or Telegram number)' })
  @IsString()
  phone!: string;

  @ApiProperty({ description: '4-digit SMS code' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'code must be a 4-digit number' })
  code!: string;
}
