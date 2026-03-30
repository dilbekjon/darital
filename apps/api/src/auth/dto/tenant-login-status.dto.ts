import { IsString, Matches } from 'class-validator';

export class TenantLoginStatusDto {
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone!: string;
}

