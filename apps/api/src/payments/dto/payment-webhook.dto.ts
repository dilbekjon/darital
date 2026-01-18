import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaymentProviderEnum } from './payment-intent.dto';

export class PaymentWebhookDto {
  @IsOptional()
  @IsString()
  paymentId?: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  rawPayload?: any;

  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}


