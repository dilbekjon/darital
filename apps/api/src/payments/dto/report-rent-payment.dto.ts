import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { OfflinePaymentSource, PAYMENT_SOURCES } from './record-offline-payment.dto';

export class ReportRentPaymentDto {
  @ApiProperty({ description: 'Invoice ID the tenant is paying' })
  @IsString()
  invoiceId!: string;

  @ApiPropertyOptional({ description: 'Paid amount as numeric string (e.g., "500000"). Defaults to the remaining due for the chosen source.' })
  @IsOptional()
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 500000)' })
  amount?: string;

  @ApiProperty({ enum: PAYMENT_SOURCES, description: 'How the tenant paid: BANK or CASH' })
  @IsIn(PAYMENT_SOURCES)
  source!: OfflinePaymentSource;

  @ApiPropertyOptional({ description: 'Optional note from the tenant (receipt number, transfer reference, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
