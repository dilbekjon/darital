import { IsString, MinLength } from 'class-validator';

export class TelegramExchangeDto {
  @IsString()
  @MinLength(10)
  token!: string;
}

