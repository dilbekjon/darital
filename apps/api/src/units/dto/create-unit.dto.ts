import { IsString, IsNumber, IsOptional, IsPositive, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Unit 101' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 150000.50, description: 'Unit price' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 75.5, description: 'Area in square meters' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  area?: number;

  @ApiPropertyOptional({ example: 1, description: 'Floor number' })
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

  @ApiPropertyOptional({ example: 'clx123...', description: 'Building ID to assign this unit to' })
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiPropertyOptional({ example: 'clxCompanyId', description: 'Company ID that holds this unit (optional)' })
  @IsOptional()
  @IsString()
  companyId?: string;
}
