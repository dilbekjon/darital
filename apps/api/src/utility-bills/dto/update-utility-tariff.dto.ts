import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class UpdateUtilityTariffDto {
  @ApiPropertyOptional({ description: 'Electricity tariff (price per kWh)' })
  @IsOptional()
  @IsNumberString()
  electricityPerKwh?: string;

  @ApiPropertyOptional({ description: 'Gas tariff (price per m3)' })
  @IsOptional()
  @IsNumberString()
  gasPerM3?: string;

  @ApiPropertyOptional({ description: 'Water tariff (price per m3)' })
  @IsOptional()
  @IsNumberString()
  waterPerM3?: string;
}
