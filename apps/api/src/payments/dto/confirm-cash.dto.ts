import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class ConfirmCashDto {
  @ApiPropertyOptional({ description: 'Confirmed cash amount as numeric string, e.g. "500000"' })
  @IsOptional()
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 500000)' })
  amount?: string;

  @ApiPropertyOptional({ description: 'Optional note for this confirmation step' })
  @IsOptional()
  @IsString()
  note?: string;
}
