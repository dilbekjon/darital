import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class TestNotificationDto {
  @ApiProperty({ description: 'Tenant ID', example: 'clabc123' })
  @IsString()
  tenantId: string;

  @ApiProperty({ enum: ['reminder', 'overdue'] as const })
  @IsIn(['reminder', 'overdue'])
  template: 'reminder' | 'overdue';
}


