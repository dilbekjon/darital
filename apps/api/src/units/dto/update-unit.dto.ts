import { IsString, IsNumber, IsOptional, IsEnum, IsPositive, Min, IsArray } from 'class-validator';
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
  @Min(1)
  floor?: number;

  @ApiPropertyOptional({ example: [1, 2], description: 'Floors occupied by this room' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  occupiedFloors?: number[];

  @ApiPropertyOptional({ enum: UnitStatus, example: UnitStatus.FREE })
  @IsOptional()
  @IsEnum(UnitStatus)
  status?: UnitStatus;

  @ApiPropertyOptional({ example: 'clx123...', description: 'Building ID to assign this unit to (set to null to unlink)' })
  @IsOptional()
  @IsString()
  buildingId?: string | null;

  @ApiPropertyOptional({ example: 'clxCompanyId', description: 'Company ID that holds this unit (set to null to mark as individual)' })
  @IsOptional()
  @IsString()
  companyId?: string | null;
}
