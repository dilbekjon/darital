import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({ example: 'Unit 101' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 150000.50, description: 'Unit price' })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiPropertyOptional({ example: 75.5, description: 'Area in square meters' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  area?: number;

  @ApiPropertyOptional({ example: 1, description: 'Floor number' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  floor?: number;
}

