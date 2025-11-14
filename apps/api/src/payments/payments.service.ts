import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll() {
    const payments = await this.prisma.payment.findMany({
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
    });

    return payments.map((payment) => ({
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
  }

  async create(dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findUnique({ 
      where: { id: dto.invoiceId }, 
      include: { contract: { include: { tenant: true } } } 
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
      return this.confirm(payment.id);
    }

    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto) {
    if (!dto.status) return this.prisma.payment.findUnique({ where: { id } });
    if (dto.status === PaymentStatus.CONFIRMED) {
      return this.confirm(id);
    }
    // Cancel or set pending without financial effects
    return this.prisma.payment.update({ where: { id }, data: { status: dto.status } });
  }

  async confirm(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === PaymentStatus.CONFIRMED) return payment;
      if (payment.status === PaymentStatus.CANCELLED) throw new ConflictException('Payment is cancelled');

      // Update payment status to confirmed
      const confirmed = await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.CONFIRMED, paidAt: new Date() } });

      // Fetch invoice with contract to get tenantId
      const invoice = await tx.invoice.findUnique({ where: { id: confirmed.invoiceId }, include: { contract: true } });
      if (!invoice) throw new NotFoundException('Invoice not found');

      // Sum confirmed payments for invoice
      const agg = await tx.payment.aggregate({
        where: { invoiceId: confirmed.invoiceId, status: PaymentStatus.CONFIRMED },
        _sum: { amount: true },
      });
      const totalPaid = new Decimal(agg._sum.amount || 0);

      // Mark invoice PAID if fully covered
      if (totalPaid.greaterThanOrEqualTo(invoice.amount)) {
        await tx.invoice.update({ where: { id: invoice.id }, data: { status: 'PAID' as any } });
      }

      // Update tenant balance (upsert)
      await tx.balance.upsert({
        where: { tenantId: invoice.contract.tenantId },
        update: { current: { increment: confirmed.amount as unknown as Prisma.Decimal } },
        create: { tenantId: invoice.contract.tenantId, current: confirmed.amount as unknown as Prisma.Decimal },
      });

      return confirmed;
    });
  }
}


