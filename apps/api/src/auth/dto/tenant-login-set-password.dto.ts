import { IsString, Matches, MinLength } from 'class-validator';

export class TenantLoginSetPasswordDto {
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone!: string;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'Invalid code format' })
  code!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}

