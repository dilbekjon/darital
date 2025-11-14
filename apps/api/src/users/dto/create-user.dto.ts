import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { AdminRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.ADMIN, description: 'Admin role for the user' })
  @IsOptional()
  role?: AdminRole;
}
