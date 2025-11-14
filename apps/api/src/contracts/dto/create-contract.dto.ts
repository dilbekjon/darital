import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class CreateContractDto {
  @ApiProperty()
  @IsString()
  tenantId!: string;

  @ApiProperty()
  @IsString()
  unitId!: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ description: 'Decimal amount as string, e.g., 1000.50' })
  @IsNumberString()
  amount!: string;

  @ApiPropertyOptional({ description: 'Additional contract notes or description' })
  @IsOptional()
  @IsString()
  notes?: string;
}


