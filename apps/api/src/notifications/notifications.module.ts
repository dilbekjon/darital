import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { TenantNotificationsController } from './tenant-notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailModule } from '../mail/mail.module';
// TelegramModule is imported in AppModule, no need to import here to avoid duplicate initialization
import { FcmModule } from '../fcm/fcm.module';
import { SmsModule } from '../sms/sms.module';
import { MinioModule } from '../minio/minio.module';
import { ReminderScheduler } from '../queues/reminder.scheduler';

@Module({
  imports: [
    MailModule,
    // TelegramModule is already imported in AppModule - don't import here to avoid conflicts
    FcmModule,
    SmsModule,
    MinioModule,
  ],
  controllers: [NotificationsController, TenantNotificationsController],
  providers: [NotificationsService, ReminderScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}


