import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 'clx123456',
  })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({
    description: 'Sender role (case-insensitive)',
    enum: ['TENANT', 'ADMIN', 'tenant', 'admin'],
    example: 'TENANT',
  })
  @IsString()
  @IsNotEmpty()
  senderRole: string; // Will be validated case-insensitively in gateway

  @ApiProperty({
    description: 'Sender ID (user ID or tenant ID)',
    example: 'clx789012',
  })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I have a question about my invoice',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'File URL (for attachments)',
    example: 'https://storage.example.com/file.pdf',
    required: false,
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}

