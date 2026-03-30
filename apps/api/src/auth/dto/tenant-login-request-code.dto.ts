import { IsString, Matches } from 'class-validator';

export class TenantLoginRequestCodeDto {
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone!: string;
}

