import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumberString, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  contractId!: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ description: 'Decimal amount as string, e.g., 1000.00' })
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 1000.00)' })
  amount!: string;
}


