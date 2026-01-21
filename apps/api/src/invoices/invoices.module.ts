import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesScheduler } from './invoices.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  imports: [NotificationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesScheduler, AuditInterceptor],
  exports: [InvoicesService],
})
export class InvoicesModule {}


