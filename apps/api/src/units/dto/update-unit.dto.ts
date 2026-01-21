import { IsString, IsNumber, IsOptional, IsEnum, IsPositive, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnitStatus } from '@prisma/client';

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Unit 101' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 150000.50 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 75.5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  area?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floor?: number;

  @ApiPropertyOptional({ enum: UnitStatus, example: UnitStatus.FREE })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional({ example: 'clx123...', description: 'Building ID to assign this unit to (set to null to unlink)' })
  @IsOptional()
  @IsString()
  buildingId?: string | null;
}

