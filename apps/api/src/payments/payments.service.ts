import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, PaymentStatus, PaymentProvider, Prisma, InvoiceStatus, AdminRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentProviderEnum } from './dto/payment-intent.dto';
import { CheckoutUzService } from './checkout-uz.service';
import { ChatGateway } from '../chat/chat.gateway';
import { OfflinePaymentSource } from './dto/record-offline-payment.dto';

@Injectable()
export class PaymentsService {
  private chatGateway: ChatGateway | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly checkoutUzService: CheckoutUzService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Get ChatGateway instance lazily to avoid circular dependency
   */
  private getChatGateway(): ChatGateway | null {
    if (!this.chatGateway && this.moduleRef) {
      try {
        this.chatGateway = this.moduleRef.get(ChatGateway, { strict: false });
      } catch {
        // Gateway not available yet (during module initialization)
        return null;
      }
    }
    return this.chatGateway;
  }

  private isSuccessStatus(status?: string) {
    if (!status) return false;
    const normalized = status.toUpperCase();
    return ['SUCCESS', 'CONFIRMED', 'PAID'].includes(normalized);
  }

  private mapProviderEnum(provider?: PaymentProviderEnum | PaymentProvider): PaymentProvider {
    if (!provider) return PaymentProvider.NONE;
    // Both enums have same values, so we can safely cast
    return provider as unknown as PaymentProvider;
  }

  private normalizeCheckoutUzStatus(status?: string) {
    // Normalize Checkout.uz status to lowercase (same as Python pattern)
    return status ? status.toLowerCase().trim() : '';
  }

  private getMonthRange(month?: string) {
    const now = new Date();
    const match = month?.match(/^(\d{4})-(\d{2})$/);
    const year = match ? Number(match[1]) : now.getUTCFullYear();
    const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth();
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
    return { start, end, month: `${year}-${String(monthIndex + 1).padStart(2, '0')}` };
  }

  async getCollectorMonthlySummary(actorId: string, month?: string) {
    const { start, end, month: normalizedMonth } = this.getMonthRange(month);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        isArchived: false,
        dueDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        contract: {
          include: {
            tenant: {
              select: {
                id: true,
                fullName: true,
                phone: true,
              },
            },
            unit: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: {
          where: {
            isArchived: false,
            source: 'CASH',
            status: { in: [PaymentStatus.PENDING, PaymentStatus.CONFIRMED] },
          },
          select: {
            id: true,
            amount: true,
            status: true,
            collectedBy: true,
            collectedAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const items = invoices
      .map((invoice) => {
        const cashTargetRaw = new Decimal((invoice as any).cashAmount ?? 0);
        const hasSplit = !new Decimal((invoice as any).bankAmount ?? 0).plus(cashTargetRaw).equals(0);
        const cashTarget = hasSplit ? cashTargetRaw : new Decimal(invoice.amount);
        if (cashTarget.lte(0)) return null;

        const cashCollected = invoice.payments.reduce(
          (sum, payment) => sum.plus(payment.amount),
          new Decimal(0),
        );
        const remainingRaw = cashTarget.minus(cashCollected);
        const remaining = remainingRaw.gt(0) ? remainingRaw : new Decimal(0);

        return {
          invoiceId: invoice.id,
          dueDate: invoice.dueDate.toISOString(),
          tenantId: invoice.contract.tenant.id,
          tenantName: invoice.contract.tenant.fullName,
          tenantPhone: invoice.contract.tenant.phone,
          unitId: invoice.contract.unit?.id ?? null,
          unitName: invoice.contract.unit?.name ?? null,
          cashTarget: cashTarget.toNumber(),
          cashCollected: cashCollected.toNumber(),
          remaining: remaining.toNumber(),
          status: remaining.eq(0) ? 'COLLECTED' : cashCollected.gt(0) ? 'PARTIAL' : 'PENDING',
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const requiredAmount = items.reduce((sum, item) => sum + item.cashTarget, 0);
    const collectedAmount = items.reduce((sum, item) => sum + item.cashCollected, 0);
    const remainingAmount = items.reduce((sum, item) => sum + item.remaining, 0);

    const myCollectedPayments = await this.prisma.payment.findMany({
      where: {
        isArchived: false,
        source: 'CASH',
        collectedBy: actorId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.CONFIRMED] },
        createdAt: { gte: start, lt: end },
      },
      select: {
        amount: true,
        invoiceId: true,
      },
    });

    const myCollectedAmount = myCollectedPayments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
    const myCollectedInvoiceCount = new Set(myCollectedPayments.map((payment) => payment.invoiceId)).size;

    return {
      month: normalizedMonth,
      totals: {
        requiredCount: items.length,
        collectedCount: items.filter((item) => item.cashCollected > 0).length,
        remainingCount: items.filter((item) => item.remaining > 0).length,
        requiredAmount,
        collectedAmount,
        remainingAmount,
        myCollectedAmount,
        myCollectedInvoiceCount,
      },
      items: {
        shouldCollect: items,
        collected: items.filter((item) => item.cashCollected > 0),
        remaining: items.filter((item) => item.remaining > 0),
      },
    };
  }

  async confirmPaymentTransaction(params: {
    paymentId: string;
    providerPaymentId?: string;
    paidAt?: Date | string | null;
    amount?: number | string | Decimal;
    rawPayload?: any;
    provider?: PaymentProviderEnum | PaymentProvider;
    approvedBy?: string;
  }) {
    const { paymentId, providerPaymentId, paidAt, amount, rawPayload, provider, approvedBy } = params;

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: { include: { contract: true } } },
      });
      if (!payment) throw new NotFoundException('Payment not found');

      const paymentWithMeta = payment as any;

      // Idempotency: if already confirmed, return early (but update metadata if provided)
      if (payment.status === PaymentStatus.CONFIRMED) {
        const updates: any = {};
        if (providerPaymentId && !paymentWithMeta.providerPaymentId) {
          updates.providerPaymentId = providerPaymentId;
        }
        if (rawPayload) {
          updates.rawPayload = rawPayload;
        }
        if (provider && !paymentWithMeta.provider) {
          updates.provider = provider;
        }
        if (Object.keys(updates).length > 0) {
          await tx.payment.update({
            where: { id: payment.id },
            data: updates,
          });
        }
        return { ...payment, ...updates };
      }

      const invoice = payment.invoice;
      
      // Validate amount: webhook amount must match payment amount (or be >= invoice amount for partial payments)
      if (amount !== undefined) {
        const webhookAmount = new Decimal(amount);
        const paymentAmount = payment.amount;
        // Allow webhook amount to match payment amount exactly, or be >= invoice amount
        if (!webhookAmount.equals(paymentAmount) && webhookAmount.lessThan(invoice.amount)) {
          throw new ConflictException(
            `Webhook amount ${webhookAmount.toString()} does not match payment amount ${paymentAmount.toString()} and is less than invoice amount ${invoice.amount.toString()}`
          );
        }
      }

      const now = new Date();
      const updateData: any = {
        status: PaymentStatus.CONFIRMED,
        paidAt: paidAt ? new Date(paidAt) : now,
        providerPaymentId: providerPaymentId ?? paymentWithMeta.providerPaymentId,
        provider: this.mapProviderEnum(provider ?? paymentWithMeta.provider),
        rawPayload: rawPayload ?? paymentWithMeta.rawPayload,
      };
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = now;
      }
      const confirmed = await tx.payment.update({
        where: { id: payment.id },
        data: updateData,
      });

      // Mark invoice as PAID only if both BANK and CASH parts are paid (split logic).
      // Fallback to legacy behavior when split columns are empty (0 + 0).
      const bankDue = new Decimal((invoice as any).bankAmount || 0);
      const cashDue = new Decimal((invoice as any).cashAmount || 0);
      const hasSplit = !bankDue.plus(cashDue).equals(0);

      if (hasSplit) {
        const confirmedBySource = await tx.payment.groupBy({
          by: ['source'],
          where: {
            invoiceId: invoice.id,
            status: PaymentStatus.CONFIRMED,
          },
          _sum: { amount: true },
        });

        const sumFor = (sources: string[]) =>
          confirmedBySource
            .filter((r) => sources.includes(String((r as any).source)))
            .reduce((sum, r) => sum.plus(new Decimal((r as any)._sum?.amount || 0)), new Decimal(0));

        // Treat ONLINE payments as BANK for completeness (even though online is disabled in UI now).
        const bankPaid = sumFor(['BANK', 'ONLINE']);
        const cashPaid = sumFor(['CASH']);

        if (bankPaid.greaterThanOrEqualTo(bankDue) && cashPaid.greaterThanOrEqualTo(cashDue)) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID' as any },
          });
        }
      } else {
        // Legacy: total confirmed payments >= invoice.amount
        const totalConfirmed = await tx.payment.aggregate({
          where: {
            invoiceId: invoice.id,
            status: PaymentStatus.CONFIRMED,
          },
          _sum: { amount: true },
        });
        const totalPaid = new Decimal(totalConfirmed._sum.amount || 0);
        if (totalPaid.greaterThanOrEqualTo(invoice.amount)) {
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID' as any },
          });
        }
      }

      // Update tenant balance
      await tx.balance.upsert({
        where: { tenantId: invoice.contract.tenantId },
        update: { current: { increment: confirmed.amount as unknown as Prisma.Decimal } },
        create: { tenantId: invoice.contract.tenantId, current: confirmed.amount as unknown as Prisma.Decimal },
      });

      return confirmed;
    });

    // Emit payment_updated event via WebSocket (after transaction completes)
    // Fetch payment with full relations for emission
    const paymentWithRelations = await this.prisma.payment.findUnique({
      where: { id: confirmed.id },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (paymentWithRelations) {
      const gateway = this.getChatGateway();
      if (gateway) {
        // Emit asynchronously to not block the response
        setImmediate(async () => {
          try {
            await gateway.emitPaymentUpdated(paymentWithRelations);
          } catch (error) {
            // Log but don't fail payment confirmation
            console.error('[PaymentsService] Failed to emit payment_updated event:', error);
          }
        });
      }
    }

    return confirmed;
  }

  async handleWebhook(provider: PaymentProviderEnum, dto: PaymentWebhookDto) {
    // For Checkout.uz (UZUM and CLICK both use Checkout.uz), always verify payment via API first (same pattern as Python)
    // This ensures we always have the latest status from Checkout.uz
    if (provider === PaymentProviderEnum.UZUM || provider === PaymentProviderEnum.CLICK) {
      const orderId = dto.order_id || dto.orderId || dto.providerPaymentId;
      if (orderId) {
        // Verify payment status via Checkout.uz API (same as Python verify_payment)
        // Map CLICK to UZUM internally since both use Checkout.uz
        return this.confirmCheckoutUzOrder(orderId, dto.paymentId, dto);
      }
      // If no orderId, fall through to generic webhook handling
    }

    const { paymentId, providerPaymentId, status, paidAt, amount } = dto;
    
    // Find payment by providerPaymentId first (more reliable), then by paymentId
    let targetPayment = null;
    if (providerPaymentId) {
      targetPayment = await this.prisma.payment.findUnique({ 
        where: { providerPaymentId } as any,
        include: { invoice: true },
      });
    }
    if (!targetPayment && paymentId) {
      targetPayment = await this.prisma.payment.findUnique({ 
        where: { id: paymentId },
        include: { invoice: true },
      });
    }

    if (!targetPayment) {
      // Payment not found - return 200 for idempotency (webhook may be retried)
      return { ok: true, message: 'Payment not found' };
    }

    // Validate invoice exists
    if (!targetPayment.invoice) {
      return { ok: true, message: 'Invoice not found for payment' };
    }

    // If already confirmed, return early (idempotent)
    if (targetPayment.status === PaymentStatus.CONFIRMED) {
      return { ok: true, alreadyConfirmed: true };
    }

    // Validate amount if provided
    if (amount !== undefined) {
      const webhookAmount = new Decimal(amount);
      const paymentAmount = targetPayment.amount;
      // Amount must match payment amount exactly (or be >= invoice amount for partial payments)
      if (!webhookAmount.equals(paymentAmount) && webhookAmount.lessThan(targetPayment.invoice.amount)) {
        return { 
          ok: false, 
          error: `Amount mismatch: webhook ${webhookAmount.toString()} vs payment ${paymentAmount.toString()}` 
        };
      }
    }

    if (this.isSuccessStatus(status)) {
      // Check if payment already has webhook data (idempotency check)
      const existingRawPayload = (targetPayment as any).rawPayload;
      const hasWebhookData = existingRawPayload?.webhook || 
                            existingRawPayload?.status === 'paid' || 
                            existingRawPayload?.status === 'success' ||
                            existingRawPayload?.paidAt;
      
      // Prepare webhook payload with explicit webhook flag
      const webhookPayload = {
        ...(dto.rawPayload ?? dto),
        webhook: true, // Explicit flag to indicate webhook was received
        status: status || 'paid',
        receivedAt: new Date().toISOString(),
      };

      // Payment received successfully - keep as PENDING for admin verification
      // Store provider info but don't auto-confirm (admin must verify)
      const updated = await this.prisma.payment.update({
        where: { id: targetPayment.id },
        data: {
          providerPaymentId: providerPaymentId ?? (targetPayment as any).providerPaymentId ?? undefined,
          provider: this.mapProviderEnum(provider ?? (targetPayment as any).provider),
          rawPayload: webhookPayload,
          // Keep status as PENDING - admin will verify
        } as any,
        include: {
          invoice: {
            include: {
              contract: {
                include: {
                  tenant: true,
                  unit: true,
                },
              },
            },
          },
        },
      });

      // Only send notification if this is the first time webhook data is being stored
      // This prevents duplicate notifications from webhook retries or scheduler checks
      if (!hasWebhookData) {
        const unitName = (updated.invoice as any)?.contract?.unit?.name;
        await this.notifications.notifyTenantPaymentReceived(
          targetPayment.invoice.contract.tenantId,
          updated.id,
          updated.amount.toNumber(),
          provider,
          unitName,
        );
      }

      // Emit payment_updated event for real-time admin updates
      const gateway = this.getChatGateway();
      if (gateway) {
        setImmediate(async () => {
          try {
            await gateway.emitPaymentUpdated(updated);
          } catch (error) {
            console.error('[PaymentsService] Failed to emit payment_updated event:', error);
          }
        });
      }

      return { ok: true, pending: true, message: 'Payment received, awaiting admin verification' };
    }

    // Non-success: just persist raw payload and provider ids for debugging
    await this.prisma.payment.update({
      where: { id: targetPayment.id },
      data: {
        providerPaymentId: providerPaymentId ?? (targetPayment as any).providerPaymentId,
        provider: this.mapProviderEnum(provider ?? (targetPayment as any).provider),
        rawPayload: dto.rawPayload ?? dto,
      } as any,
    });

    return { ok: true, status: 'non-success stored' };
  }

  async findAll(query: ListPaymentsQueryDto) {
    const { page, limit, tenantId, contractId, status, fromDate, toDate, includeArchived, onlyArchived } = query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where: Prisma.PaymentWhereInput = {};

    const onlyArchivedBool = onlyArchived === true || String(onlyArchived) === 'true' || String(onlyArchived) === '1';
    const includeArchivedBool = includeArchived === true || String(includeArchived) === 'true' || String(includeArchived) === '1';

    // Archive filtering
    if (onlyArchivedBool) {
      where.isArchived = true;
    } else if (!includeArchivedBool) {
      where.isArchived = false;
    }

    if (status) where.status = status;
    // Build createdAt filter safely without spreading ambiguous types
    if (fromDate || toDate) {
      const createdAt: any = {};
      if (fromDate) createdAt.gte = new Date(fromDate);
      if (toDate) createdAt.lte = new Date(toDate);
      where.createdAt = createdAt;
    }
    if (contractId) {
      where.invoice = { contractId };
    } else if (tenantId) {
      where.invoice = { contract: { tenantId } };
    }

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          invoice: {
            include: {
              payments: {
                select: {
                  id: true,
                  status: true,
                  amount: true,
                  source: true,
                  method: true,
                },
              },
              contract: {
                include: {
                  tenant: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  unit: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    // Sort by importance: 
    // 1. PENDING with overdue invoice first
    // 2. PENDING (awaiting verification) 
    // 3. CANCELLED
    // 4. CONFIRMED (most recent first)
    const now = new Date();
    const sortedPayments = [...payments].sort((a, b) => {
      // Status priority: PENDING > CANCELLED > CONFIRMED
      const statusPriority = { PENDING: 0, CANCELLED: 1, CONFIRMED: 2 };
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within PENDING, prioritize overdue invoices
      if (a.status === 'PENDING' && b.status === 'PENDING') {
        const aOverdue = a.invoice?.dueDate && new Date(a.invoice.dueDate) < now;
        const bOverdue = b.invoice?.dueDate && new Date(b.invoice.dueDate) < now;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
      }
      
      // Within same status, sort by createdAt (most recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const data = sortedPayments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      method: payment.method,
      source: (payment as any).source || null,
      amount: payment.amount.toNumber(),
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      provider: (payment as any).provider || null,
      providerPaymentId: (payment as any).providerPaymentId || null,
      rawPayload: (payment as any).rawPayload || null,
      // Offline payment tracking fields
      collectedBy: payment.collectedBy,
      collectedAt: payment.collectedAt ? payment.collectedAt.toISOString() : null,
      tenantConfirmedBy: (payment as any).tenantConfirmedBy ?? null,
      tenantConfirmedAt: (payment as any).tenantConfirmedAt ? new Date((payment as any).tenantConfirmedAt).toISOString() : null,
      collectorNote: payment.collectorNote,
      approvedBy: payment.approvedBy,
      approvedAt: payment.approvedAt ? payment.approvedAt.toISOString() : null,
      // Archive fields
      isArchived: payment.isArchived,
      archivedAt: payment.archivedAt ? payment.archivedAt.toISOString() : null,
      archivedBy: payment.archivedBy,
      archiveReason: payment.archiveReason,
      tenant: payment.invoice.contract.tenant,
      unit: payment.invoice.contract.unit,
      invoice: {
        id: payment.invoice.id,
        amount: payment.invoice.amount.toNumber(),
        bankAmount: (payment.invoice as any).bankAmount?.toNumber?.() ?? null,
        cashAmount: (payment.invoice as any).cashAmount?.toNumber?.() ?? null,
        status: payment.invoice.status,
        dueDate: payment.invoice.dueDate ? payment.invoice.dueDate.toISOString() : null,
        payments: (payment.invoice as any).payments?.map((invPayment: any) => ({
          id: invPayment.id,
          status: invPayment.status,
          amount: invPayment.amount?.toNumber?.() ?? Number(invPayment.amount ?? 0),
          source: invPayment.source ?? null,
          method: invPayment.method ?? null,
        })) ?? [],
      },
    }));

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  }

  async create(dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { contract: { include: { tenant: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Create pending payment first
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        method: dto.method,
        source: dto.method === PaymentMethod.ONLINE ? 'ONLINE' : 'CASH',
        amount: new Decimal(dto.amount),
        status: PaymentStatus.PENDING,
      },
    });

    // Send admin notification (Email + Telegram)
    await this.notifications.notifyAdminNewPayment(
      payment.id,
      invoice.contract.tenant.fullName,
      payment.amount.toNumber(),
      dto.method,
    );

    if (dto.method === PaymentMethod.ONLINE) {
      // Simulate gateway: confirm immediately transactionally
      return this.confirmPaymentTransaction({ paymentId: payment.id });
    }

    return payment;
  }

  /**
   * Record offline payment - Used by PAYMENT_COLLECTOR
   * Creates a PENDING payment. Cashier must approve via verify/accept to confirm.
   */
  async recordOfflinePayment(
    dto: { invoiceIds: string[]; amount?: string; source: OfflinePaymentSource; collectorNote?: string; collectedAt?: string },
    actor: { id: string; role?: string },
  ) {
    const role = actor.role;
    if (role === AdminRole.PAYMENT_COLLECTOR && dto.source !== 'CASH') {
      throw new ConflictException('Payment collector faqat naqd to‘lov qo‘sha oladi');
    }

    const uniqueInvoiceIds = [...new Set(dto.invoiceIds)];
    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: uniqueInvoiceIds } },
      include: {
        contract: { include: { tenant: true, unit: true } },
        payments: { where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.CONFIRMED] } } },
      },
    });

    if (invoices.length !== uniqueInvoiceIds.length) {
      throw new NotFoundException('Ba’zi hisob-fakturalar topilmadi');
    }

    const orderedInvoices = [...invoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const amountPoolProvided = dto.amount !== undefined && dto.amount !== null && String(dto.amount).trim() !== '';
    let amountPool = amountPoolProvided ? new Decimal(dto.amount as string) : null;
    if (amountPool && amountPool.lte(0)) {
      throw new ConflictException('To‘lov summasi 0 dan katta bo‘lishi kerak');
    }

    const createdPayments = await this.prisma.$transaction(async (tx) => {
      const results = [] as any[];

      for (const invoice of orderedInvoices) {
        const bankDue = new Decimal((invoice as any).bankAmount || 0);
        const cashDue = new Decimal((invoice as any).cashAmount || 0);
        const hasSplit = !bankDue.plus(cashDue).equals(0);

        const sumBySource = (sources: string[]) =>
          invoice.payments
            .filter((p: any) => sources.includes(String(p.source)) && p.status !== PaymentStatus.CANCELLED)
            .reduce((sum: Decimal, p: any) => sum.plus(p.amount), new Decimal(0));

        const bankPaid = sumBySource(['BANK', 'ONLINE']);
        const cashPaid = sumBySource(['CASH']);

        // Remaining is computed per requested source (BANK or CASH).
        const dueForSource = (() => {
          if (hasSplit) return dto.source === 'BANK' ? bankDue : cashDue;
          // Legacy invoices without split: allow collecting against full invoice amount
          return new Decimal(invoice.amount);
        })();
        const paidForSource = (() => {
          if (hasSplit) return dto.source === 'BANK' ? bankPaid : cashPaid;
          return sumBySource(['BANK', 'ONLINE', 'CASH']);
        })();
        const remaining = dueForSource.minus(paidForSource);

        if (remaining.lte(0)) {
          if (uniqueInvoiceIds.length === 1) {
            const label = dto.source === 'BANK' ? 'bank' : 'naqd';
            throw new ConflictException(`Invoice ${invoice.id} uchun ${label} qismi allaqachon yopilgan`);
          }
          continue;
        }

        const amount = (() => {
          if (amountPool) {
            const alloc = remaining.lessThan(amountPool) ? remaining : amountPool;
            return alloc;
          }
          if (uniqueInvoiceIds.length === 1 && dto.amount) {
            return new Decimal(dto.amount);
          }
          return remaining;
        })();

        if (amount.lte(0)) {
          continue;
        }
        if (amount.greaterThan(remaining)) {
          throw new ConflictException(`Invoice ${invoice.id} uchun summa qolgan ${dto.source === 'BANK' ? 'bank' : 'naqd'} qarzdorlikdan oshib ketdi`);
        }

        results.push(
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              method: PaymentMethod.OFFLINE,
              source: dto.source,
              provider: PaymentProvider.NONE,
              amount,
              status: PaymentStatus.PENDING,
              collectedBy: actor.id,
              collectedAt: null,
              collectorNote: dto.collectorNote,
              tenantConfirmedAt: null,
              tenantConfirmedBy: null,
            } as any,
            include: {
              invoice: {
                include: {
                  contract: {
                    include: {
                      tenant: { select: { id: true, fullName: true, email: true } },
                      unit: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          }),
        );

        if (amountPool) {
          amountPool = amountPool.minus(amount);
          if (amountPool.lte(0)) break;
        }
      }

      if (results.length === 0) {
        throw new ConflictException('Tanlangan invoice’lar uchun taqsimlanadigan summa topilmadi');
      }

      if (amountPool && amountPool.greaterThan(0)) {
        throw new ConflictException(`Kiritilgan summa to‘liq taqsimlanmadi. Ortiqcha: ${amountPool.toString()}`);
      }

      return results;
    });

    const gateway = this.getChatGateway();
    if (gateway) {
      setImmediate(async () => {
        try {
          await Promise.all(createdPayments.map((payment) => gateway.emitPaymentUpdated(payment)));
        } catch (error) {
          console.error('[PaymentsService] Failed to emit payment_updated event:', error);
        }
      });
    }

    return {
      items: createdPayments,
      count: createdPayments.length,
      message:
        role === AdminRole.PAYMENT_COLLECTOR
          ? 'Naqd to‘lov yozildi. Avval tenant, keyin to‘lov yig‘uvchi, oxirida kassir tasdiqlaydi.'
          : 'To‘lovlar yozildi. Tasdiqlash uchun tayyor.',
    };
  }

  async tenantConfirmCashGiven(paymentId: string, tenantId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: { select: { id: true, fullName: true, email: true } },
                unit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.invoice.contract.tenantId !== tenantId) {
      throw new ForbiddenException('Siz bu to‘lovni tasdiqlay olmaysiz');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Faqat PENDING holatdagi to‘lov tasdiqlanadi');
    }
    if (payment.method !== PaymentMethod.OFFLINE || String((payment as any).source) !== 'CASH') {
      throw new ConflictException('Faqat naqd oflayn to‘lov uchun tenant tasdiqlashi mavjud');
    }

    if ((payment as any).tenantConfirmedAt) {
      return payment;
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        tenantConfirmedAt: new Date(),
        tenantConfirmedBy: tenantId,
      } as any,
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: { select: { id: true, fullName: true, email: true } },
                unit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const gateway = this.getChatGateway();
    if (gateway) {
      setImmediate(async () => {
        try {
          await gateway.emitPaymentUpdated(updated);
        } catch (error) {
          console.error('[PaymentsService] Failed to emit payment_updated event:', error);
        }
      });
    }

    return updated;
  }

  async collectorConfirmCashReceived(paymentId: string, collectorId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: { select: { id: true, fullName: true, email: true } },
                unit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Faqat PENDING holatdagi to‘lov qabul qilinadi');
    }
    if (payment.method !== PaymentMethod.OFFLINE || String((payment as any).source) !== 'CASH') {
      throw new ConflictException('Faqat naqd oflayn to‘lovni qabul qilish mumkin');
    }
    if (!(payment as any).tenantConfirmedAt) {
      throw new ConflictException('Avval tenant "pul berdim" ni tasdiqlashi kerak');
    }
    if (payment.collectedAt) {
      return payment;
    }

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        collectedBy: payment.collectedBy || collectorId,
        collectedAt: new Date(),
      } as any,
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: { select: { id: true, fullName: true, email: true } },
                unit: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const gateway = this.getChatGateway();
    if (gateway) {
      setImmediate(async () => {
        try {
          await gateway.emitPaymentUpdated(updated);
        } catch (error) {
          console.error('[PaymentsService] Failed to emit payment_updated event:', error);
        }
      });
    }

    return updated;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    if (!dto.status) return this.prisma.payment.findUnique({ where: { id } });
    if (dto.status === PaymentStatus.CONFIRMED) {
      return this.confirmPaymentTransaction({ paymentId: id });
    }
    
    // Cancel or set pending without financial effects
    const updated = await this.prisma.payment.update({ 
      where: { id }, 
      data: { status: dto.status },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Emit payment_updated event via WebSocket
    const gateway = this.getChatGateway();
    if (gateway) {
      setImmediate(async () => {
        try {
          await gateway.emitPaymentUpdated(updated);
        } catch (error) {
          console.error('[PaymentsService] Failed to emit payment_updated event:', error);
        }
      });
    }

    return updated;
  }

  /**
   * Verify payment (Accept or Decline) - Only for admins
   * Accept: Confirms payment and marks invoice as paid
   * Decline: Cancels payment
   */
  async verifyPayment(paymentId: string, accept: boolean, declineReason?: string, approverId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                tenant: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Idempotency: if already in final state, return without sending notifications
    if (accept && payment.status === PaymentStatus.CONFIRMED) {
      // Already confirmed, return existing payment without sending duplicate notifications
      return payment;
    }
    if (!accept && payment.status === PaymentStatus.CANCELLED) {
      // Already cancelled, return existing payment without sending duplicate notifications
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException(`Payment is already ${payment.status}, cannot verify`);
    }

    if (
      accept &&
      payment.method === PaymentMethod.OFFLINE &&
      String((payment as any).source) === 'CASH' &&
      (!(payment as any).tenantConfirmedAt || !payment.collectedAt)
    ) {
      throw new ConflictException('Naqd to‘lov uchun avval tenant va to‘lov yig‘uvchi tasdiqlari kerak');
    }

    if (accept) {
      const confirmed = await this.confirmPaymentTransaction({
        paymentId,
        ...(approverId ? { approvedBy: approverId } : {}),
      });

      // Fetch full payment details for notification and WebSocket
      const confirmedWithRelations = await this.prisma.payment.findUnique({
        where: { id: confirmed.id },
        include: {
          invoice: {
            include: {
              contract: {
                include: {
                  tenant: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  unit: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (confirmedWithRelations) {
        // Send confirmation notification to tenant (only once)
        const unitName = (confirmedWithRelations.invoice as any)?.contract?.unit?.name;
        await this.notifications.notifyTenantPaymentVerified(
          payment.invoice.contract.tenantId,
          paymentId,
          payment.amount.toNumber(),
          true,
          undefined,
          unitName,
        );

        // Emit payment_updated event for real-time admin updates
        const gateway = this.getChatGateway();
        if (gateway) {
          setImmediate(async () => {
            try {
              await gateway.emitPaymentUpdated(confirmedWithRelations);
            } catch (error) {
              console.error('[PaymentsService] Failed to emit payment_updated event:', error);
            }
          });
        }

        return confirmedWithRelations;
      }

      return confirmed;
    } else {
      // Decline payment: cancel it
      const declined = await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.CANCELLED } as any,
        include: {
          invoice: {
            include: {
              contract: {
                include: {
                  tenant: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                  unit: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Send decline notification to tenant
      const unitName = (declined.invoice as any)?.contract?.unit?.name;
      await this.notifications.notifyTenantPaymentVerified(
        payment.invoice.contract.tenantId,
        paymentId,
        payment.amount.toNumber(),
        false,
        declineReason || 'Payment could not be verified by financial administrators',
        unitName,
      );

      // Emit payment_updated event
      const gateway = this.getChatGateway();
      if (gateway) {
        setImmediate(async () => {
          try {
            await gateway.emitPaymentUpdated(declined);
          } catch (error) {
            console.error('[PaymentsService] Failed to emit payment_updated event:', error);
          }
        });
      }

      return declined;
    }
  }

  // kept for compatibility; delegates to confirmPaymentTransaction
  async confirm(paymentId: string) {
    return this.confirmPaymentTransaction({ paymentId });
  }

  /**
   * Click direct: Prepare phase. Validates order and amount; returns merchant_prepare_id for Complete.
   */
  async handleClickPrepare(params: {
    merchant_trans_id: string;
    amount: string;
    click_trans_id: string;
  }): Promise<{ error: number; error_note: string; merchant_prepare_id?: number }> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.merchant_trans_id },
      include: { invoice: true },
    });
    if (!payment) {
      return { error: -5, error_note: 'Payment not found' };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      if (payment.status === PaymentStatus.CONFIRMED) {
        return { error: -4, error_note: 'Already paid' };
      }
      return { error: -9, error_note: 'Invalid state' };
    }
    const amountNum = parseFloat(params.amount);
    const paymentAmount = typeof payment.amount === 'object' && 'toNumber' in payment.amount
      ? payment.amount.toNumber()
      : Number(payment.amount);
    if (Math.abs(amountNum - paymentAmount) > 0.01) {
      return { error: -2, error_note: 'Amount mismatch' };
    }
    const merchant_prepare_id = Math.abs(parseInt(params.click_trans_id.slice(-8), 10)) || 1;
    return { error: 0, error_note: 'Success', merchant_prepare_id };
  }

  /**
   * Click direct: Complete phase. Confirms payment when error=0 from Click.
   */
  async handleClickComplete(params: {
    merchant_trans_id: string;
    merchant_prepare_id: string;
    amount: string;
    click_trans_id: string;
    click_paydoc_id?: string;
    error: string;
  }): Promise<{ error: number; error_note: string }> {
    if (params.error !== '0') {
      return { error: -9, error_note: 'Payment cancelled or failed' };
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: params.merchant_trans_id },
      include: { invoice: true },
    });
    if (!payment) {
      return { error: -5, error_note: 'Payment not found' };
    }
    if (payment.status === PaymentStatus.CONFIRMED) {
      return { error: -4, error_note: 'Already paid' };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      return { error: -9, error_note: 'Invalid state' };
    }
    const amountNum = parseFloat(params.amount);
    const paymentAmount = typeof payment.amount === 'object' && 'toNumber' in payment.amount
      ? payment.amount.toNumber()
      : Number(payment.amount);
    if (Math.abs(amountNum - paymentAmount) > 0.01) {
      return { error: -2, error_note: 'Amount mismatch' };
    }
    await this.confirmPaymentTransaction({
      paymentId: payment.id,
      providerPaymentId: params.click_trans_id,
      amount: amountNum,
      paidAt: new Date(),
      rawPayload: {
        click_trans_id: params.click_trans_id,
        click_paydoc_id: params.click_paydoc_id,
        merchant_prepare_id: params.merchant_prepare_id,
        directClick: true,
      },
      provider: PaymentProvider.CLICK,
    });
    return { error: 0, error_note: 'Success' };
  }

  async confirmCheckoutUzOrder(orderId?: string | number, fallbackPaymentId?: string, rawPayload?: any) {
    if (!orderId) {
      return { ok: false, error: 'Missing order_id for CheckoutUz' };
    }

    // Ensure orderId is string for consistency (CheckoutUz returns numbers but we store as string)
    const orderIdStr = String(orderId);

    const statusResponse = await this.checkoutUzService.getInvoiceStatus(orderIdStr);
    if (!statusResponse?.ok) {
      return {
        ok: false,
        error: statusResponse?.error?.message || 'Failed to fetch CheckoutUz status',
      };
    }

    // Try to find payment by providerPaymentId (stored as string)
    let targetPayment = await this.prisma.payment.findUnique({
      where: { providerPaymentId: orderIdStr } as any,
      include: { invoice: true },
    });

    if (!targetPayment && fallbackPaymentId) {
      targetPayment = await this.prisma.payment.findUnique({
        where: { id: fallbackPaymentId },
        include: { invoice: true },
      });
      if (targetPayment && !(targetPayment as any).providerPaymentId) {
        await this.prisma.payment.update({
          where: { id: targetPayment.id },
          data: { providerPaymentId: orderIdStr, provider: PaymentProvider.UZUM } as any,
        });
      }
    }

    if (!targetPayment) {
      return { ok: true, message: 'Payment not found' };
    }

    if (targetPayment.status === PaymentStatus.CONFIRMED) {
      return { ok: true, alreadyConfirmed: true };
    }

    // Get payment status from Checkout.uz API response (same pattern as Python verify_payment)
    const payment = statusResponse.payment || {};
    const status = (payment.status || '').toLowerCase();
    const raw = { checkoutUz: statusResponse, webhook: rawPayload };

    // Checkout.uz uses "paid" status when payment was received from provider
    // Keep PENDING until admin accepts (same logic as tenant web: admin must verify first)
    if (status === 'paid') {
      const existingRawPayload = (targetPayment as any).rawPayload;
      const hasWebhookData =
        existingRawPayload?.webhook ||
        existingRawPayload?.checkoutUz?.payment?.status === 'paid' ||
        (existingRawPayload?.checkoutUz && existingRawPayload?.webhook);

      const rawWithWebhook = {
        ...raw,
        webhook: true,
        receivedAt: new Date().toISOString(),
      };

      const updated = await this.prisma.payment.update({
        where: { id: targetPayment.id },
        data: {
          providerPaymentId: orderIdStr,
          provider: PaymentProvider.UZUM,
          rawPayload: rawWithWebhook,
          // Keep status PENDING — admin must accept before confirming
        } as any,
        include: {
          invoice: {
            include: {
              contract: {
                include: { tenant: true, unit: true },
              },
            },
          },
        },
      });

      const invoiceWithContract = await this.prisma.invoice.findUnique({
        where: { id: targetPayment.invoiceId },
        include: { contract: { include: { unit: true } } },
      });

      if (invoiceWithContract && !hasWebhookData) {
        const unitName = invoiceWithContract.contract?.unit?.name;
        await this.notifications.notifyTenantPaymentReceived(
          invoiceWithContract.contract.tenantId,
          updated.id,
          updated.amount.toNumber(),
          'UZUM',
          unitName,
        );
      }

      const gateway = this.getChatGateway();
      if (gateway) {
        setImmediate(async () => {
          try {
            await gateway.emitPaymentUpdated(updated);
          } catch (error) {
            console.error('[PaymentsService] Failed to emit payment_updated event:', error);
          }
        });
      }

      return { ok: true, pending: true, message: 'Payment received, awaiting admin verification' };
    }

    if (status === 'canceled' || status === 'cancelled') {
      await this.prisma.payment.update({
        where: { id: targetPayment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          providerPaymentId: orderIdStr,
          provider: PaymentProvider.UZUM,
          rawPayload: raw,
        } as any,
      });
      return { ok: true, cancelled: true };
    }

    // Update payment metadata (status is still pending)
    await this.prisma.payment.update({
      where: { id: targetPayment.id },
      data: {
        providerPaymentId: orderIdStr,
        provider: PaymentProvider.UZUM,
        rawPayload: raw,
      } as any,
    });

    return { ok: true, status: status || 'pending' };
  }

  async refreshCheckoutUzPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if ((payment as any).provider !== PaymentProvider.UZUM) {
      return { ok: false, error: 'Payment provider is not CheckoutUz' };
    }
    return this.confirmCheckoutUzOrder((payment as any).providerPaymentId, paymentId);
  }

  /**
   * Delete a payment.
   * PENDING or CANCELLED: always allowed.
   * CONFIRMED: only when options.allowConfirmed is true (e.g. SUPER_ADMIN); reverts balance and invoice state.
   */
  async remove(paymentId: string, options?: { allowConfirmed?: boolean }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: { include: { contract: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.CONFIRMED && !options?.allowConfirmed) {
      throw new ConflictException('Cannot delete confirmed payment. Only SUPER_ADMIN can delete paid payments.');
    }

    if (payment.status === PaymentStatus.CONFIRMED && options?.allowConfirmed) {
      const invoice = payment.invoice as { id: string; amount: Prisma.Decimal; dueDate: Date; contract: { tenantId: string } };
      const tenantId = invoice.contract.tenantId;
      const amount = payment.amount as unknown as Prisma.Decimal;

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.delete({ where: { id: paymentId } });

        const balance = await tx.balance.findUnique({ where: { tenantId } });
        if (balance) {
          await tx.balance.update({
            where: { tenantId },
            data: { current: { decrement: amount } },
          });
        }

        const remaining = await tx.payment.aggregate({
          where: { invoiceId: invoice.id, status: PaymentStatus.CONFIRMED },
          _sum: { amount: true },
        });
        const totalPaid = new Decimal(remaining._sum.amount ?? 0);
        if (totalPaid.lessThan(invoice.amount)) {
          const dueDate = new Date(invoice.dueDate);
          const newStatus = dueDate < new Date() ? InvoiceStatus.OVERDUE : InvoiceStatus.PENDING;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: newStatus },
          });
        }
      });
    } else {
      await this.prisma.payment.delete({
        where: { id: paymentId },
      });
    }

    const gateway = this.getChatGateway();
    if (gateway) {
      setImmediate(async () => {
        try {
          await gateway.emitPaymentUpdated({ ...payment, status: 'DELETED' } as any);
        } catch (error) {
          console.error('[PaymentsService] Failed to emit payment_updated event:', error);
        }
      });
    }

    return { message: 'Payment deleted successfully', id: paymentId };
  }
}
