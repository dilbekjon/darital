import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class CollectorConfirmUtilityPaymentDto {
  @ApiPropertyOptional({ description: 'Amount collector received from tenant. Defaults to tenant-declared amount.' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ description: 'Optional collector note' })
  @IsOptional()
  @IsString()
  note?: string;
}
