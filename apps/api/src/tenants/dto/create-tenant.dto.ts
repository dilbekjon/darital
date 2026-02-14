import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ description: 'Phone number (e.g. 998901234567)' })
  @IsString()
  @Matches(/^[0-9+]{9,15}$/, { message: 'Invalid phone format' })
  phone!: string;
}


