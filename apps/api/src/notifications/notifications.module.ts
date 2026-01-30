import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { TenantNotificationsController } from './tenant-notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailModule } from '../mail/mail.module';
import { FcmModule } from '../fcm/fcm.module';
import { SmsModule } from '../sms/sms.module';
import { MinioModule } from '../minio/minio.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { ReminderScheduler } from '../queues/reminder.scheduler';

@Module({
  imports: [
    MailModule,
    FcmModule,
    SmsModule,
    MinioModule,
    InAppNotificationsModule,
  ],
  controllers: [NotificationsController, TenantNotificationsController],
  providers: [NotificationsService, ReminderScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}


