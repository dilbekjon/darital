import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ description: 'Phone number (e.g. 998901234567)' })
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Tenant email address (optional)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  utilityElectricityEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  utilityGasEnabled?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  utilityWaterEnabled?: boolean;
}
