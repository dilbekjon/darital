import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional, IsEnum } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'ISO date string' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Decimal amount as string, e.g., 1000.00' })
  @IsOptional()
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 1000.00)' })
  amount?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
