import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UtilityType } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertUtilityReadingDto {
  @ApiProperty({ description: 'Tenant id' })
  @IsString()
  tenantId!: string;

  @ApiProperty({ enum: UtilityType })
  @IsEnum(UtilityType)
  type!: UtilityType;

  @ApiProperty({ description: 'Billing month as YYYY-MM' })
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @ApiPropertyOptional({ description: 'Start meter reading numeric string' })
  @IsOptional()
  @IsNumberString()
  startReading?: string;

  @ApiPropertyOptional({ description: 'End meter reading numeric string' })
  @IsOptional()
  @IsNumberString()
  endReading?: string;

  @ApiPropertyOptional({ description: 'Unit price numeric string. If omitted, tariff config is used.' })
  @IsOptional()
  @IsNumberString()
  unitPrice?: string;

  @ApiPropertyOptional({ description: 'Optional note' })
  @IsOptional()
  @IsString()
  note?: string;
}
