import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTelegramMessageDto {
  @ApiProperty({ description: 'Tenant ID or Chat ID to send message to' })
  @IsString()
  @IsNotEmpty()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Chat ID (alternative to tenantId)' })
  @IsString()
  @IsOptional()
  chatId?: string;

  @ApiProperty({ description: 'Message text to send' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Optional image URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
