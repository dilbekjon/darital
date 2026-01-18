import { Module } from '@nestjs/common';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';
import { PrismaService } from '../prisma.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService, PrismaService],
})
export class TenantPortalModule {}
