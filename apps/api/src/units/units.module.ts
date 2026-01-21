import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, AuditInterceptor],
})
export class UnitsModule {}

