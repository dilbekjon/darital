import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Admin email address' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'admin@example.com', description: 'Admin email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Admin password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;
}
