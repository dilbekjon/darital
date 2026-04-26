import { ApiPropertyOptional } from '@nestjs/swagger';
import { UtilityBillStatus } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class UpdateUtilityBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  startReading?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  endReading?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  unitPrice?: string;

  @ApiPropertyOptional({ enum: UtilityBillStatus })
  @IsOptional()
  @IsEnum(UtilityBillStatus)
  status?: UtilityBillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
