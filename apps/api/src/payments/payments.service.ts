import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, PaymentStatus, PaymentProvider, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentProviderEnum } from './dto/payment-intent.dto';
import { CheckoutUzService } from './checkout-uz.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly checkoutUzService: CheckoutUzService,
  ) {}

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
    return status ? status.toLowerCase() : '';
  }

  async confirmPaymentTransaction(params: {
    paymentId: string;
    providerPaymentId?: string;
    paidAt?: Date | string | null;
    amount?: number | string | Decimal;
    rawPayload?: any;
    provider?: PaymentProviderEnum | PaymentProvider;
  }) {
    const { paymentId, providerPaymentId, paidAt, amount, rawPayload, provider } = params;

    return this.prisma.$transaction(async (tx) => {
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

      // Update payment to CONFIRMED
      const confirmed = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CONFIRMED,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          providerPaymentId: providerPaymentId ?? paymentWithMeta.providerPaymentId,
          provider: this.mapProviderEnum(provider ?? paymentWithMeta.provider),
          rawPayload: rawPayload ?? paymentWithMeta.rawPayload,
        } as any,
      });

      // Check total confirmed payments for this invoice
      const totalConfirmed = await tx.payment.aggregate({
        where: {
          invoiceId: invoice.id,
          status: PaymentStatus.CONFIRMED,
        },
        _sum: { amount: true },
      });

      const totalPaid = new Decimal(totalConfirmed._sum.amount || 0);

      // Mark invoice as PAID only if total confirmed payments >= invoice amount
      if (totalPaid.greaterThanOrEqualTo(invoice.amount)) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID' as any },
        });
      }

      // Update tenant balance
      await tx.balance.upsert({
        where: { tenantId: invoice.contract.tenantId },
        update: { current: { increment: confirmed.amount as unknown as Prisma.Decimal } },
        create: { tenantId: invoice.contract.tenantId, current: confirmed.amount as unknown as Prisma.Decimal },
      });

      return confirmed;
    });
  }

  async handleWebhook(provider: PaymentProviderEnum, dto: PaymentWebhookDto) {
    if (provider === PaymentProviderEnum.UZUM) {
      const orderId = dto.order_id || dto.orderId || dto.providerPaymentId;
      return this.confirmCheckoutUzOrder(orderId, dto.paymentId, dto);
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
      await this.confirmPaymentTransaction({
        paymentId: targetPayment.id,
        providerPaymentId: providerPaymentId ?? (targetPayment as any).providerPaymentId ?? undefined,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        amount: amount !== undefined ? amount : targetPayment.amount,
        rawPayload: dto.rawPayload ?? dto,
        provider: provider,
      });
      return { ok: true, confirmed: true };
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
    const { page, limit, tenantId, contractId, status, fromDate, toDate } = query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where: Prisma.PaymentWhereInput = {};

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
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    const data = payments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      method: payment.method,
      amount: payment.amount.toNumber(),
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      tenant: payment.invoice.contract.tenant,
      invoice: {
        id: payment.invoice.id,
        amount: payment.invoice.amount.toNumber(),
        status: payment.invoice.status,
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

  async update(id: string, dto: UpdatePaymentDto) {
    if (!dto.status) return this.prisma.payment.findUnique({ where: { id } });
    if (dto.status === PaymentStatus.CONFIRMED) {
      return this.confirmPaymentTransaction({ paymentId: id });
    }
    // Cancel or set pending without financial effects
    return this.prisma.payment.update({ where: { id }, data: { status: dto.status } });
  }

  // kept for compatibility; delegates to confirmPaymentTransaction
  async confirm(paymentId: string) {
    return this.confirmPaymentTransaction({ paymentId });
  }

  async confirmCheckoutUzOrder(orderId?: string, fallbackPaymentId?: string, rawPayload?: any) {
    if (!orderId) {
      return { ok: false, error: 'Missing order_id for CheckoutUz' };
    }

    const statusResponse = await this.checkoutUzService.getInvoiceStatus(orderId);
    if (!statusResponse?.ok) {
      return {
        ok: false,
        error: statusResponse?.error?.message || 'Failed to fetch CheckoutUz status',
      };
    }

    let targetPayment = await this.prisma.payment.findUnique({
      where: { providerPaymentId: orderId } as any,
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
          data: { providerPaymentId: orderId, provider: PaymentProvider.UZUM } as any,
        });
      }
    }

    if (!targetPayment) {
      return { ok: true, message: 'Payment not found' };
    }

    if (targetPayment.status === PaymentStatus.CONFIRMED) {
      return { ok: true, alreadyConfirmed: true };
    }

    const paymentStatus = this.normalizeCheckoutUzStatus(statusResponse.payment?.status);
    const raw = { checkoutUz: statusResponse, webhook: rawPayload };

    if (paymentStatus === 'paid') {
      await this.confirmPaymentTransaction({
        paymentId: targetPayment.id,
        providerPaymentId: orderId,
        paidAt: statusResponse.payment?.paid_at,
        amount: statusResponse.payment?.amount ?? targetPayment.amount,
        rawPayload: raw,
        provider: PaymentProviderEnum.UZUM,
      });
      return { ok: true, confirmed: true };
    }

    if (paymentStatus === 'canceled') {
      await this.prisma.payment.update({
        where: { id: targetPayment.id },
        data: {
          status: PaymentStatus.CANCELLED,
          providerPaymentId: orderId,
          provider: PaymentProvider.UZUM,
          rawPayload: raw,
        } as any,
      });
      return { ok: true, cancelled: true };
    }

    await this.prisma.payment.update({
      where: { id: targetPayment.id },
      data: {
        providerPaymentId: orderId,
        provider: PaymentProvider.UZUM,
        rawPayload: raw,
      } as any,
    });

    return { ok: true, status: paymentStatus || 'pending' };
  }

  async refreshCheckoutUzPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if ((payment as any).provider !== PaymentProvider.UZUM) {
      return { ok: false, error: 'Payment provider is not CheckoutUz' };
    }
    return this.confirmCheckoutUzOrder((payment as any).providerPaymentId, paymentId);
  }
}


