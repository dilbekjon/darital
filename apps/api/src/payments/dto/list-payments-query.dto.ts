import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class ListPaymentsQueryDto {
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

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by createdAt >= fromDate (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter by createdAt <= toDate (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Include archived payments (default: false)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @ApiPropertyOptional({ description: 'Only return archived payments (default: false)', default: false })
  @IsOptional()
  @Type(() => Boolean)
  onlyArchived?: boolean;
}

