import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma, LedgerEntryType } from '@prisma/client';

export interface PostLedgerEntryParams {
  tenantId: string;
  type: LedgerEntryType;
  /** Signed amount: positive = credit (raises balance), negative = debit (lowers balance). */
  amount: Decimal | number | string;
  /** Human-readable reason shown to tenant and admin (Uzbek). */
  description: string;
  occurredAt?: Date;
  contractId?: string | null;
  invoiceId?: string | null;
  utilityBillId?: string | null;
  paymentId?: string | null;
  createdBy?: string | null;
}

type Db = Prisma.TransactionClient | PrismaService;

/**
 * Single source of truth for the tenant "balance wallet".
 *
 * Every change to a tenant's balance goes through `post()`, which atomically
 * updates `Balance.current` and appends an immutable `LedgerEntry` carrying the
 * reason and the running balance snapshot. Positive amounts are credits
 * (downpayment, payments); negative amounts are debits (rent / utility charges).
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a ledger entry and move the balance. Pass a transaction client (`tx`)
   * to compose with surrounding work; otherwise it runs in its own transaction.
   */
  async post(params: PostLedgerEntryParams, tx?: Prisma.TransactionClient) {
    if (tx) return this.postWithClient(tx, params);
    return this.prisma.$transaction((client) => this.postWithClient(client, params));
  }

  private async postWithClient(db: Db, params: PostLedgerEntryParams) {
    const amount = new Decimal(params.amount);
    const balance = await (db as any).balance.findUnique({ where: { tenantId: params.tenantId } });
    const before = new Decimal(balance?.current ?? 0);
    const after = before.plus(amount);

    await (db as any).balance.upsert({
      where: { tenantId: params.tenantId },
      update: { current: after },
      create: { tenantId: params.tenantId, current: after },
    });

    return (db as any).ledgerEntry.create({
      data: {
        tenantId: params.tenantId,
        type: params.type,
        amount,
        balanceAfter: after,
        description: params.description,
        occurredAt: params.occurredAt ?? undefined,
        contractId: params.contractId ?? undefined,
        invoiceId: params.invoiceId ?? undefined,
        utilityBillId: params.utilityBillId ?? undefined,
        paymentId: params.paymentId ?? undefined,
        createdBy: params.createdBy ?? 'system',
      },
    });
  }

  async getBalance(tenantId: string): Promise<Decimal> {
    const b = await this.prisma.balance.findUnique({ where: { tenantId } });
    return new Decimal(b?.current ?? 0);
  }

  /** Full balance history for a tenant, newest first. */
  async getHistory(tenantId: string, limit = 300) {
    return this.prisma.ledgerEntry.findMany({
      where: { tenantId },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }
}
