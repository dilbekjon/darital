import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { LedgerService } from './ledger.service';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus, PaymentStatus, UtilityBillStatus, UtilityType } from '@prisma/client';

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const UTILITY_LABELS: Record<UtilityType, string> = {
  WATER: 'Suv',
  ELECTRICITY: 'Elektr',
  GAS: 'Gaz',
} as any;

/**
 * Posts rent and utility charges to the tenant ledger as they come due,
 * automatically settling the matching invoice / bill from the balance wallet
 * (prepaid credit / downpayment). When the wallet is exhausted the balance
 * goes negative (debt) and the invoice / bill stays unpaid.
 */
@Injectable()
export class BalanceChargeService {
  private readonly logger = new Logger(BalanceChargeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledRun() {
    await this.runCharges();
  }

  /** Charge all due-but-unbilled rent and utilities. Returns counts. Safe to run repeatedly. */
  async runCharges(): Promise<{ rent: number; utilities: number }> {
    const rent = await this.chargeDueRent();
    const utilities = await this.chargeDueUtilities();
    if (rent || utilities) {
      this.logger.log(`Balance charges posted: rent=${rent}, utilities=${utilities}`);
    }
    return { rent, utilities };
  }

  private rentMonthLabel(dueDate: Date): string {
    // Invoice dueDate is the first day of the month AFTER the rental month,
    // so the rental month is one day before the due date.
    const d = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    return `${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  private async chargeDueRent(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.invoice.findMany({
      where: {
        ledgerChargedAt: null,
        dueDate: { lte: now },
        isArchived: false,
        contract: { isArchived: false, status: { in: ['ACTIVE', 'COMPLETED'] as any } },
      },
      include: { contract: true },
      orderBy: { dueDate: 'asc' },
    });

    let count = 0;
    for (const inv of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const fresh = await tx.invoice.findUnique({ where: { id: inv.id } });
          if (!fresh || fresh.ledgerChargedAt) return; // already charged (race guard)

          const tenantId = inv.contract.tenantId;
          const charge = new Decimal(fresh.amount);

          if (charge.lessThanOrEqualTo(0)) {
            await tx.invoice.update({ where: { id: fresh.id }, data: { ledgerChargedAt: now } });
            return;
          }

          const balRow = await tx.balance.findUnique({ where: { tenantId } });
          const before = new Decimal(balRow?.current ?? 0);
          const covered = Decimal.max(new Decimal(0), Decimal.min(before, charge));

          await this.ledger.post(
            {
              tenantId,
              type: 'RENT_CHARGE',
              amount: charge.negated(),
              description: `Ijara to'lovi — ${this.rentMonthLabel(fresh.dueDate)}`,
              contractId: fresh.contractId,
              invoiceId: fresh.id,
            },
            tx,
          );

          const confirmed = await tx.payment.aggregate({
            where: { invoiceId: fresh.id, status: PaymentStatus.CONFIRMED },
            _sum: { amount: true },
          });
          const confirmedPaid = new Decimal(confirmed._sum.amount ?? 0);
          const totalSettled = confirmedPaid.plus(covered);
          const status: InvoiceStatus = totalSettled.greaterThanOrEqualTo(charge)
            ? InvoiceStatus.PAID
            : fresh.dueDate < now
              ? InvoiceStatus.OVERDUE
              : InvoiceStatus.PENDING;

          await tx.invoice.update({
            where: { id: fresh.id },
            data: { balancePaidAmount: covered, ledgerChargedAt: now, status },
          });
        });
        count++;
      } catch (err: any) {
        this.logger.error(`Failed to charge rent for invoice ${inv.id}: ${err?.message || err}`);
      }
    }
    return count;
  }

  private async chargeDueUtilities(): Promise<number> {
    const now = new Date();
    const bills = await this.prisma.utilityBill.findMany({
      where: {
        ledgerChargedAt: null,
        status: { in: [UtilityBillStatus.PENDING, UtilityBillStatus.PARTIALLY_PAID] },
      },
      orderBy: { billingMonth: 'asc' },
    });

    let count = 0;
    for (const bill of bills) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const fresh = await tx.utilityBill.findUnique({ where: { id: bill.id } });
          if (!fresh || fresh.ledgerChargedAt) return;

          const amount = new Decimal(fresh.amount);
          const alreadyPaid = new Decimal(fresh.paidAmount ?? 0);
          const charge = Decimal.max(new Decimal(0), amount.minus(alreadyPaid));

          if (charge.lessThanOrEqualTo(0)) {
            await tx.utilityBill.update({ where: { id: fresh.id }, data: { ledgerChargedAt: now } });
            return;
          }

          const balRow = await tx.balance.findUnique({ where: { tenantId: fresh.tenantId } });
          const before = new Decimal(balRow?.current ?? 0);
          const covered = Decimal.max(new Decimal(0), Decimal.min(before, charge));

          const monthLabel = `${UZ_MONTHS[new Date(fresh.billingMonth).getMonth()]} ${new Date(fresh.billingMonth).getFullYear()}`;
          await this.ledger.post(
            {
              tenantId: fresh.tenantId,
              type: 'UTILITY_CHARGE',
              amount: charge.negated(),
              description: `${UTILITY_LABELS[fresh.type]} to'lovi — ${monthLabel}`,
              utilityBillId: fresh.id,
            },
            tx,
          );

          const totalSettled = alreadyPaid.plus(covered);
          const status: UtilityBillStatus = totalSettled.greaterThanOrEqualTo(amount)
            ? UtilityBillStatus.PAID
            : covered.greaterThan(0)
              ? UtilityBillStatus.PARTIALLY_PAID
              : fresh.status;

          await tx.utilityBill.update({
            where: { id: fresh.id },
            data: { balancePaidAmount: covered, ledgerChargedAt: now, status },
          });
        });
        count++;
      } catch (err: any) {
        this.logger.error(`Failed to charge utility bill ${bill.id}: ${err?.message || err}`);
      }
    }
    return count;
  }
}
