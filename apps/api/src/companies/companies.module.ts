import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, AuditInterceptor],
})
export class CompaniesModule {}

