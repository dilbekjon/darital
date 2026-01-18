import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CheckoutUzService } from './checkout-uz.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, AuditInterceptor, CheckoutUzService],
  exports: [PaymentsService, CheckoutUzService],
})
export class PaymentsModule {}


