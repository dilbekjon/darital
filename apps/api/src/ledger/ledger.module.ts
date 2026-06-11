import { Global, Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { BalanceChargeService } from './balance-charge.service';

@Global()
@Module({
  providers: [LedgerService, BalanceChargeService],
  exports: [LedgerService, BalanceChargeService],
})
export class LedgerModule {}
