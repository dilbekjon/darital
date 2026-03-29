import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsDateString, IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';

export const PAYMENT_SOURCES = ['BANK', 'CASH'] as const;
export type OfflinePaymentSource = (typeof PAYMENT_SOURCES)[number];

export class RecordOfflinePaymentDto {
  @ApiProperty({ description: 'Invoice IDs to pay' , type: [String]})
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  invoiceIds!: string[];

  @ApiPropertyOptional({ description: 'Amount received for a single invoice (as string, e.g., "100000")' })
  @IsOptional()
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 100000)' })
  amount!: string;

  @ApiProperty({ enum: PAYMENT_SOURCES, description: 'Payment source: BANK or CASH' })
  @IsIn(PAYMENT_SOURCES)
  source!: OfflinePaymentSource;

  @ApiPropertyOptional({ description: 'Note from collector (receipt number, etc.)' })
  @IsOptional()
  @IsString()
  collectorNote?: string;

  @ApiPropertyOptional({ description: 'Date when cash was collected (ISO string). Defaults to now.' })
  @IsOptional()
  @IsDateString()
  collectedAt?: string;
}
