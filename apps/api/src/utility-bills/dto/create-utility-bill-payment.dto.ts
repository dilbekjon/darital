import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateUtilityBillPaymentDto {
  @ApiProperty({ enum: PaymentSource, description: 'Use BANK or CASH for utility bill payments' })
  @IsEnum(PaymentSource)
  source!: PaymentSource;

  @ApiPropertyOptional({ description: 'Payment amount. Defaults to remaining bill amount if omitted.' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ description: 'Optional payment note' })
  @IsOptional()
  @IsString()
  note?: string;
}
