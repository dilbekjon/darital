import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ description: 'Monthly bank amount as string, e.g., 600.00' })
  @IsNumberString()
  bankAmount!: string;

  @ApiProperty({ description: 'Monthly cash amount as string, e.g., 400.00' })
  @IsNumberString()
  cashAmount!: string;

  @ApiPropertyOptional({ description: 'Upfront downpayment total as string, e.g., 5000.00. Credited to the tenant balance.' })
  @IsOptional()
  @IsNumberString()
  downPaymentAmount?: string;

  @ApiPropertyOptional({ description: 'Downpayment bank portion as string' })
  @IsOptional()
  @IsNumberString()
  downPaymentBankAmount?: string;

  @ApiPropertyOptional({ description: 'Downpayment cash portion as string' })
  @IsOptional()
  @IsNumberString()
  downPaymentCashAmount?: string;

  @ApiPropertyOptional({ description: 'Additional contract notes or description' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Utility services for this contract's tenant (applied to the Tenant record on create)
  @ApiPropertyOptional({ description: 'Enable electricity utility for the tenant' })
  @IsOptional()
  @IsBoolean()
  utilityElectricityEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable gas utility for the tenant' })
  @IsOptional()
  @IsBoolean()
  utilityGasEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable water utility for the tenant' })
  @IsOptional()
  @IsBoolean()
  utilityWaterEnabled?: boolean;
}

