import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReceiptData(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
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

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'CONFIRMED') {
      throw new NotFoundException('Receipt only available for confirmed payments');
    }

    const tenant = payment.invoice.contract.tenant;
    const unit = payment.invoice.contract.unit as any;
    const contract = payment.invoice.contract;

    return {
      receipt: {
        number: `RCP-${payment.id.slice(-8).toUpperCase()}`,
        date: payment.paidAt || payment.createdAt,
        generatedAt: new Date(),
      },
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        provider: payment.provider,
        transactionId: payment.providerPaymentId || payment.externalRef || 'N/A',
        paidAt: payment.paidAt,
      },
      invoice: {
        id: payment.invoice.id,
        dueDate: payment.invoice.dueDate,
        amount: Number(payment.invoice.amount),
        period: this.getInvoicePeriod(payment.invoice.dueDate),
      },
      tenant: {
        id: tenant.id,
        fullName: tenant.fullName,
        phone: tenant.phone,
        email: tenant.email,
      },
      property: {
        unitName: unit.name,
        building: unit.building?.name || 'N/A',
        address: unit.building?.address || 'N/A',
        floor: unit.floor,
      },
      contract: {
        id: contract.id,
        startDate: contract.startDate,
        endDate: contract.endDate,
        monthlyRent: Number(contract.amount),
      },
      company: {
        name: 'Darital Property Management',
        address: 'Tashkent, Uzbekistan',
        phone: '+998 XX XXX XX XX',
        email: 'info@darital.uz',
      },
    };
  }

  private getInvoicePeriod(dueDate: Date): string {
    const date = new Date(dueDate);
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  async getPaymentHistory(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          contract: {
            tenantId,
          },
        },
        status: 'CONFIRMED',
      },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      receiptNumber: `RCP-${p.id.slice(-8).toUpperCase()}`,
      amount: Number(p.amount),
      paidAt: p.paidAt,
      method: p.method,
      provider: p.provider,
      unitName: p.invoice.contract.unit.name,
      period: this.getInvoicePeriod(p.invoice.dueDate),
    }));
  }

  async getPaymentChartData(tenantId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          contract: {
            tenantId,
          },
        },
        status: 'CONFIRMED',
      },
      include: {
        invoice: true,
      },
      orderBy: { paidAt: 'asc' },
    });

    // Group by month
    const monthlyData: Record<string, { paid: number; due: number }> = {};

    payments.forEach((p) => {
      const date = new Date(p.paidAt || p.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { paid: 0, due: 0 };
      }
      monthlyData[key].paid += Number(p.amount);
    });

    // Get all invoices for due amounts
    const invoices = await this.prisma.invoice.findMany({
      where: {
        contract: {
          tenantId,
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    invoices.forEach((inv) => {
      const date = new Date(inv.dueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { paid: 0, due: 0 };
      }
      monthlyData[key].due += Number(inv.amount);
    });

    // Convert to array and sort
    const chartData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        monthLabel: this.formatMonthLabel(month),
        paid: data.paid,
        due: data.due,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Calculate summary
    const totalPaid = chartData.reduce((sum, d) => sum + d.paid, 0);
    const totalDue = chartData.reduce((sum, d) => sum + d.due, 0);

    return {
      chartData,
      summary: {
        totalPaid,
        totalDue,
        onTimePayments: payments.filter((p) => {
          const paidDate = new Date(p.paidAt || p.createdAt);
          const dueDate = new Date(p.invoice.dueDate);
          return paidDate <= dueDate;
        }).length,
        latePayments: payments.filter((p) => {
          const paidDate = new Date(p.paidAt || p.createdAt);
          const dueDate = new Date(p.invoice.dueDate);
          return paidDate > dueDate;
        }).length,
        averagePayment: payments.length > 0 ? totalPaid / payments.length : 0,
      },
    };
  }

  private formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
  }
}
