import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CheckoutUzService } from './checkout-uz.service';
import { ClickService } from './click.service';
import { PaymentsScheduler } from './payments.scheduler';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, AuditInterceptor, CheckoutUzService, ClickService, PaymentsScheduler],
  exports: [PaymentsService, CheckoutUzService, ClickService],
})
export class PaymentsModule {}


