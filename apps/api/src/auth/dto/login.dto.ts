import { IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  login?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}


