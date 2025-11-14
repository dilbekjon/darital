import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, PrismaService, AuditInterceptor],
  exports: [TenantsService],
})
export class TenantsModule {}


