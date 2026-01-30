import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListInvoicesQueryDto) {
    const { page, limit, tenantId, contractId, status, dueFrom, dueTo, includeArchived, onlyArchived } = query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where: any = {};

    // Archive filtering: query params can come as strings; only treat explicit true/'true'/'1' as true so archived are excluded by default
    const onlyArchivedBool = onlyArchived === true || String(onlyArchived) === 'true' || String(onlyArchived) === '1';
    const includeArchivedBool = includeArchived === true || String(includeArchived) === 'true' || String(includeArchived) === '1';
    if (onlyArchivedBool) {
      where.isArchived = true;
    } else if (!includeArchivedBool) {
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
      // Archive fields
      isArchived: invoice.isArchived,
      archivedAt: invoice.archivedAt ? invoice.archivedAt.toISOString() : null,
      archivedBy: invoice.archivedBy,
      archiveReason: invoice.archiveReason,
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
    try {
      const now = new Date();
      await this.prisma.invoice.updateMany({
        where: {
          dueDate: { lt: now },
          NOT: { status: InvoiceStatus.PAID },
          status: { not: InvoiceStatus.OVERDUE },
        },
        data: { status: InvoiceStatus.OVERDUE },
      });
    } catch (error: any) {
      // Handle table not found errors gracefully - don't spam logs
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        // Only log once per minute to avoid spam
        const lastLogTime = (this as any).__lastTableErrorLog || 0;
        const now = Date.now();
        if (now - lastLogTime > 60000) { // Log at most once per minute
          this.logger.warn(`⚠️ Invoice table not ready: ${error?.message}`);
          this.logger.warn('   Run migrations: npx prisma migrate deploy');
          (this as any).__lastTableErrorLog = now;
        }
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Create monthly invoices for a contract automatically
   * Used when contract is activated
   * Generates one invoice per month for the entire contract duration
   */
  async createForContract(contractId: string, contractAmount: Decimal, startDate: Date, endDate: Date): Promise<any[]> {
    const invoices = [];
    const monthlyAmount = contractAmount;
    
    // Start from the first day of the contract start month
    let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const contractEnd = new Date(endDate);
    
    this.logger.log(`📅 Creating invoices for contract ${contractId}: ${currentMonth.toISOString()} to ${contractEnd.toISOString()}`);
    
    // Generate invoices for each month that is within contract duration
    while (currentMonth < contractEnd) {
      // Due date is the last day of the current month (or first day of next month at midnight)
      // This represents "payment due for this month"
      const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      
      // If the calculated due date exceeds the contract end date, use contract end date
      if (dueDate > contractEnd) {
        dueDate.setTime(contractEnd.getTime());
      }
      
      // Check if invoice already exists with this exact due date
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: {
          contractId,
          dueDate: dueDate,
        },
      });
      
      // Only create if it doesn't exist
      if (!existingInvoice) {
        const invoice = await this.prisma.invoice.create({
          data: {
            contractId,
            dueDate,
            amount: monthlyAmount,
            status: InvoiceStatus.PENDING,
          },
          include: { payments: true, contract: true },
        });
        invoices.push(invoice);
        this.logger.log(`   📄 Created invoice for ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} with due date ${dueDate.toISOString()}`);
      } else {
        this.logger.log(`   ⏭️ Skipped ${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} - invoice already exists`);
      }
      
      // Move to next month
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }
    
    this.logger.log(
      `✅ Created ${invoices.length} monthly invoice(s) for contract ${contractId}`
    );
    
    return invoices;
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


