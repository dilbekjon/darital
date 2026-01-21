import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListInvoicesQueryDto) {
    const { page, limit, tenantId, contractId, status, dueFrom, dueTo, includeArchived, onlyArchived } = query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where: any = {};

    // Archive filtering
    if (onlyArchived) {
      where.isArchived = true;
    } else if (!includeArchived) {
      where.isArchived = false;
    }

    if (tenantId) where.contract = { tenantId };
    if (contractId) where.contract = { ...(where.contract || {}), id: contractId };
    if (status) where.status = status;
    if (dueFrom) where.dueDate = { ...(where.dueDate || {}), gte: new Date(dueFrom) };
    if (dueTo) where.dueDate = { ...(where.dueDate || {}), lte: new Date(dueTo) };

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: { 
          payments: true, 
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
        orderBy: [
          { dueDate: 'asc' }, // Earlier due dates first
        ],
        skip,
        take: safeLimit,
      }),
    ]);

    // Sort by importance: OVERDUE > PENDING > PAID
    // Within each status, sort by dueDate
    const statusPriority = { OVERDUE: 0, PENDING: 1, PAID: 2 };
    const sortedInvoices = [...invoices].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Within same status, sort by due date (earlier first for overdue/pending, later first for paid)
      if (a.status === 'PAID') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    // Transform the response to ensure all data is properly serialized
    const data = sortedInvoices.map((invoice) => ({
      id: invoice.id,
      contractId: invoice.contractId,
      dueDate: invoice.dueDate.toISOString(),
      amount: invoice.amount.toNumber(),
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      contract: invoice.contract ? {
        id: invoice.contract.id,
        tenantId: invoice.contract.tenantId,
        unitId: invoice.contract.unitId,
        tenant: invoice.contract.tenant,
        unit: invoice.contract.unit,
      } : null,
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        amount: payment.amount.toNumber(),
        method: payment.method,
        provider: (payment as any).provider || null,
        providerPaymentId: (payment as any).providerPaymentId || null,
        rawPayload: (payment as any).rawPayload || null,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
        createdAt: payment.createdAt.toISOString(),
      })),
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

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, contract: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    // Ensure contract exists before creating invoice
    await this.prisma.contract.findUniqueOrThrow({
      where: { id: dto.contractId },
    });

    // Status defaults to PENDING via schema
    return this.prisma.invoice.create({
      data: {
        contractId: dto.contractId,
        dueDate: new Date(dto.dueDate),
        amount: new Decimal(dto.amount),
      },
      include: { payments: true, contract: true },
    });
  }

  async generateQrCode(id: string) {
    const invoice = await this.findOne(id);
    
    const isPaid = invoice.status === InvoiceStatus.PAID;
    
    // Generate QR string for payment providers
    // Format: payme://payment?invoice_id=xxx&amount=yyy
    // This is a generic format - in production, each provider (Click, Payme, Uzum) 
    // would have their own specific format
    const qrString = isPaid 
      ? null 
      : `payme://payment?invoice_id=${invoice.id}&amount=${invoice.amount.toString()}`;

    return {
      invoiceId: invoice.id,
      amount: invoice.amount,
      qrString,
      paid: isPaid,
      status: invoice.status,
      dueDate: invoice.dueDate,
    };
  }

  // Mark overdue invoices every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async markOverdueInvoices(): Promise<void> {
    const now = new Date();
    await this.prisma.invoice.updateMany({
      where: {
        dueDate: { lt: now },
        NOT: { status: InvoiceStatus.PAID },
        status: { not: InvoiceStatus.OVERDUE },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }

  /**
   * Create invoice for a contract automatically
   * Used when contract is activated
   */
  async createForContract(contractId: string, contractAmount: Decimal, startDate: Date, endDate: Date): Promise<any> {
    // Calculate due date: first of next month from start date
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(1); // Set to first day of month
    
    // If contract is less than a month, use contract end date
    if (dueDate > endDate) {
      dueDate.setTime(endDate.getTime());
    }

    return this.create({
      contractId,
      dueDate: dueDate.toISOString(),
      amount: contractAmount.toString(),
    });
  }

  /**
   * Update an invoice
   * Only allowed if invoice is not PAID
   */
  async update(id: string, dto: { dueDate?: string; amount?: string; status?: string }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if invoice has any confirmed payments - cannot edit amount if so
    const hasConfirmedPayments = invoice.payments.some(
      (payment) => payment.status === 'CONFIRMED'
    );

    if (invoice.status === 'PAID') {
      throw new ConflictException('Cannot edit a paid invoice');
    }

    if (hasConfirmedPayments && dto.amount) {
      throw new ConflictException('Cannot change amount of invoice with confirmed payments');
    }

    const updateData: any = {};
    
    if (dto.dueDate) {
      updateData.dueDate = new Date(dto.dueDate);
    }
    
    if (dto.amount) {
      updateData.amount = parseFloat(dto.amount);
    }
    
    if (dto.status) {
      updateData.status = dto.status;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        contract: {
          include: {
            tenant: true,
            unit: true,
          },
        },
        payments: true,
      },
    });

    return updated;
  }

  async archive(id: string, adminId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { contract: { include: { tenant: true } } },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.isArchived) {
      throw new ConflictException('Invoice is already archived');
    }

    const archivedAt = new Date();
    return this.prisma.invoice.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt,
        archivedBy: adminId,
        archiveReason: reason,
      },
    });
  }

  async unarchive(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.isArchived) {
      throw new ConflictException('Invoice is not archived');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      },
    });
  }

  /**
   * Permanently delete an invoice
   * Only allowed if invoice is archived and has no confirmed payments
   * Pending payments can be deleted along with the invoice
   */
  async remove(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if invoice is archived
    if (!invoice.isArchived) {
      throw new ConflictException('Cannot permanently delete non-archived invoice. Archive it first.');
    }

    // Check if invoice has any confirmed payments
    const hasConfirmedPayments = invoice.payments.some(
      (payment) => payment.status === 'CONFIRMED'
    );

    if (hasConfirmedPayments) {
      throw new ConflictException('Cannot delete invoice with confirmed payments. Confirmed payments affect financial records.');
    }

    // Delete all pending/cancelled payments associated with this invoice
    await this.prisma.payment.deleteMany({
      where: { invoiceId: id },
    });

    // Delete the invoice
    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: 'Invoice deleted successfully', id };
  }
}


