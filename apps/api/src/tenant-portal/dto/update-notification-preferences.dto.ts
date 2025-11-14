import { IsArray, IsBoolean, IsIn, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class NotificationChannelPreference {
  @ApiProperty({
    description: 'Notification channel',
    enum: ['EMAIL', 'TELEGRAM', 'PUSH', 'SMS'],
    example: 'PUSH',
  })
  @IsString()
  @IsIn(['EMAIL', 'TELEGRAM', 'PUSH', 'SMS'])
  channel: string;

  @ApiProperty({
    description: 'Whether this channel is enabled',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Array of notification channel preferences',
    type: [NotificationChannelPreference],
    example: [
      { channel: 'PUSH', enabled: true },
      { channel: 'SMS', enabled: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelPreference)
  preferences: NotificationChannelPreference[];
}

