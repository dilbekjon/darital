import { Module, forwardRef } from '@nestjs/common';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';
import { PaymentsModule } from '../payments/payments.module';
import { UtilityBillsModule } from '../utility-bills/utility-bills.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), UtilityBillsModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
