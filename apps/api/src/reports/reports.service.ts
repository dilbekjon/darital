import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const end = endDate ? new Date(endDate) : new Date();

    // Get payments in date range
    const payments = await this.prisma.payment.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
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

    // Get invoices in date range
    const invoices = await this.prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        contract: {
          include: {
            tenant: true,
          },
        },
      },
    });

    // Calculate totals
    const totalPayments = payments
      .filter(p => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const totalInvoices = invoices.reduce((sum, inv) => sum + inv.amount.toNumber(), 0);

    const pendingPayments = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const paidInvoices = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount.toNumber(), 0);

    // Get contract statistics
    const contracts = await this.prisma.contract.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    });

    const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
    const completedContracts = contracts.filter(c => c.status === 'COMPLETED').length;

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      summary: {
        totalRevenue: totalPayments,
        totalInvoiced: totalInvoices,
        pendingPayments: pendingPayments,
        paidInvoices: paidInvoices,
        outstandingAmount: totalInvoices - totalPayments,
      },
      contracts: {
        total: contracts.length,
        active: activeContracts,
        completed: completedContracts,
        draft: contracts.filter(c => c.status === 'DRAFT').length,
        cancelled: contracts.filter(c => c.status === 'CANCELLED').length,
      },
      payments: {
        total: payments.length,
        confirmed: payments.filter(p => p.status === 'CONFIRMED').length,
        pending: payments.filter(p => p.status === 'PENDING').length,
        cancelled: payments.filter(p => p.status === 'CANCELLED').length,
      },
      invoices: {
        total: invoices.length,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        pending: invoices.filter(inv => inv.status === 'PENDING').length,
        overdue: invoices.filter(inv => inv.status === 'OVERDUE').length,
      },
    };
  }
}

