import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendTelegramTestDto {
  @ApiProperty({
    description: 'Tenant ID to send the Telegram message to',
    example: 'clabc123',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({
    description: 'Message to send via Telegram',
    example: 'Hi! This is your test message.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

