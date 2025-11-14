import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { PrismaService } from '../prisma.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, PrismaService, AuditInterceptor],
})
export class UnitsModule {}

