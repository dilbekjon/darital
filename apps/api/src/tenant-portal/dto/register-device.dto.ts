import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'FCM token from Firebase Cloud Messaging',
    example: 'dTQ8xY...',
  })
  @IsString()
  fcmToken: string;

  @ApiProperty({
    description: 'Device platform',
    enum: ['ios', 'android'],
    example: 'android',
  })
  @IsString()
  @IsIn(['ios', 'android'])
  platform: string;
}

