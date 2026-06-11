import { LedgerEntry } from '@prisma/client';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v?.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toIso(v: any): string | null {
  if (!v) return null;
  try {
    return new Date(v).toISOString();
  } catch {
    return null;
  }
}

/** Shape returned to the tenant/admin frontends for a balance history entry. */
export function serializeLedgerEntry(e: LedgerEntry) {
  const amount = toNum(e.amount);
  return {
    id: e.id,
    type: e.type,
    amount, // signed: + credit, - debit
    direction: amount >= 0 ? 'credit' : 'debit',
    balanceAfter: toNum(e.balanceAfter),
    description: e.description,
    occurredAt: toIso(e.occurredAt),
    contractId: e.contractId,
    invoiceId: e.invoiceId,
    utilityBillId: e.utilityBillId,
    paymentId: e.paymentId,
    createdBy: e.createdBy,
    createdAt: toIso(e.createdAt),
  };
}

export function serializeLedgerEntries(entries: LedgerEntry[]) {
  return entries.map(serializeLedgerEntry);
}
