import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserCredentialsDto {
  @ApiPropertyOptional({ example: '+998901234567', description: 'Admin phone number' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Adminjon_2025', description: 'New password for admin' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
