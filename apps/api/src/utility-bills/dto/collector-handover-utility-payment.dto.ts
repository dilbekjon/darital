import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CollectorHandoverUtilityPaymentDto {
  @ApiPropertyOptional({ description: 'Optional note when collector hands money to cashier' })
  @IsOptional()
  @IsString()
  note?: string;
}
