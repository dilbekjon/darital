import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@example.com', description: 'Admin email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'username123', description: 'Admin username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'Admin password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;
}
