import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Topic/subject of the conversation',
    example: 'Invoice Payment Issue',
    required: false,
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiProperty({
    description: 'Initial message content',
    example: 'Hello, I need help with my invoice',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;
}

