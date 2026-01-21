import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, AuditInterceptor],
  exports: [TenantsService],
})
export class TenantsModule {}


