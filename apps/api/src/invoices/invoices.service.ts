import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { tenantId?: string; status?: InvoiceStatus }) {
    const where: any = {};
    if (filters?.tenantId) {
      where.contract = { tenantId: filters.tenantId };
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    return this.prisma.invoice.findMany({
      where,
      include: { payments: true, contract: true },
      orderBy: { dueDate: 'asc' },
    });
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
}


