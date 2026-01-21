import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  invoiceId!: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: 'Decimal amount as string, e.g., 100.00' })
  @IsNumberString({}, { message: 'amount must be a numeric string (e.g., 100.00)' })
  amount!: string;
}


