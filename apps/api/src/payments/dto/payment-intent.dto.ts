import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum PaymentProviderEnum {
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  UZUM = 'UZUM',
  NONE = 'NONE',
}

export class PaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}


