import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsString, MinLength } from 'class-validator';

export class AdjustBalanceDto {
  @ApiProperty({ description: 'Signed amount as string. Positive = credit (add), negative = debit (subtract). e.g. "1000" or "-500"' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ description: 'Reason for the manual adjustment (shown in history)' })
  @IsString()
  @MinLength(2)
  reason!: string;
}
