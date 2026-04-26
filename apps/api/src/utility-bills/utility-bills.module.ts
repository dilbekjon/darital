import { Module } from '@nestjs/common';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { UtilityBillsController } from './utility-bills.controller';
import { UtilityBillsService } from './utility-bills.service';

@Module({
  controllers: [UtilityBillsController],
  providers: [UtilityBillsService, AuditInterceptor],
  exports: [UtilityBillsService],
})
export class UtilityBillsModule {}
