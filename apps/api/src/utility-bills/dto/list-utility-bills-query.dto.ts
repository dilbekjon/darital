import { ApiPropertyOptional } from '@nestjs/swagger';
import { UtilityType, UtilityBillStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class ListUtilityBillsQueryDto {
  @ApiPropertyOptional({ description: 'Tenant id filter' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: UtilityType, description: 'Utility type filter' })
  @IsOptional()
  @IsEnum(UtilityType)
  type?: UtilityType;

  @ApiPropertyOptional({ enum: UtilityBillStatus, description: 'Bill status filter' })
  @IsOptional()
  @IsEnum(UtilityBillStatus)
  status?: UtilityBillStatus;

  @ApiPropertyOptional({ description: 'Billing month as YYYY-MM' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @ApiPropertyOptional({ description: 'Search by tenant/unit names' })
  @IsOptional()
  @IsString()
  q?: string;
}
