import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches } from 'class-validator';

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
}

