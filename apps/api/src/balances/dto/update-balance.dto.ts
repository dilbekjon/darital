import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateBalanceDto {
  @ApiPropertyOptional({ description: 'New balance as decimal string. If omitted, resets to 0.' })
  @IsOptional()
  @IsString()
  current?: string;
}


