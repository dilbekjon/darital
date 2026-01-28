import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumberString, IsOptional, IsDateString } from 'class-validator';

export class RecordOfflinePaymentDto {
  @ApiProperty({ description: 'Invoice ID to pay' })
  @IsString()
  invoiceId!: string;

  @ApiProperty({ description: 'Amount received (as string, e.g., "100000")' })
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 100000)' })
  amount!: string;

  @ApiPropertyOptional({ description: 'Note from collector (receipt number, etc.)' })
  @IsOptional()
  @IsString()
  collectorNote?: string;

  @ApiPropertyOptional({ description: 'Date when cash was collected (ISO string). Defaults to now.' })
  @IsOptional()
  @IsDateString()
  collectedAt?: string;
}
