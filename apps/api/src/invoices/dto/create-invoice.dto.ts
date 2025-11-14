import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  contractId!: string;

  @ApiProperty({ description: 'ISO date string' })
  @IsDateString()
  dueDate!: string;

  @ApiProperty({ description: 'Decimal amount as string, e.g., 1000.00' })
  @IsString()
  amount!: string;
}


