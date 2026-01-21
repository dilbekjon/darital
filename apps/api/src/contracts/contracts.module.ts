import { Module, forwardRef } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { MinioModule } from '../minio/minio.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  imports: [NotificationsModule, MinioModule, forwardRef(() => InvoicesModule)],
  controllers: [ContractsController],
  providers: [ContractsService, AuditInterceptor],
  exports: [ContractsService],
})
export class ContractsModule {}


