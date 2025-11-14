import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma.service';
import { MinioService } from '../minio/minio.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  imports: [NotificationsModule],
  controllers: [ContractsController],
  providers: [ContractsService, PrismaService, MinioService, AuditInterceptor],
})
export class ContractsModule {}


