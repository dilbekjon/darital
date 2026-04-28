import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Tenant email address (optional)' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Admin can set new password (e.g. after reset). Tenant normally sets via SMS link.' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  utilityElectricityEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  utilityGasEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  utilityWaterEnabled?: boolean;
}
