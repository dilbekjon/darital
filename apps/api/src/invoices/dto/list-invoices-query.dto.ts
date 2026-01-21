import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (max 100)', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Filter by tenantId' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Filter by contractId' })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Filter by invoice status', enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Filter dueDate >= dueFrom (ISO string)' })
  @IsOptional()
  @IsString()
  dueFrom?: string;

  @ApiPropertyOptional({ description: 'Filter dueDate <= dueTo (ISO string)' })
  @IsOptional()
  @IsString()
  dueTo?: string;

  @ApiPropertyOptional({ description: 'Include archived invoices (default: false)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @ApiPropertyOptional({ description: 'Only return archived invoices (default: false)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  onlyArchived?: boolean;
}

