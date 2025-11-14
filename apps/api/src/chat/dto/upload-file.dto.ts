import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDto {
  @ApiProperty({
    description: 'File URL that can be used in messages',
    example: '/uploads/chat/abc123-document.pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'invoice.pdf',
  })
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'application/pdf',
  })
  mimeType: string;
}

