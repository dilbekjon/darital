import { ConflictException, ForbiddenException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { PaymentIntentDto, PaymentProviderEnum } from '../payments/dto/payment-intent.dto';
import { PaymentMethod, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { CheckoutUzService } from '../payments/checkout-uz.service';
import { ClickService } from '../payments/click.service';
import { PaymentsService } from '../payments/payments.service';
import { ConfirmCashDto } from '../payments/dto/confirm-cash.dto';

@Injectable()
export class TenantPortalService {
  private readonly logger = new Logger(TenantPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutUzService: CheckoutUzService,
    private readonly clickService: ClickService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
  ) {}

  private toNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value?.toNumber === 'function') return value.toNumber();
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async getProfileForUser(user: any) {
    // Resolve tenant by id from JWT (payload.sub mapped to user.id in JwtStrategy)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
      include: {
        contracts: {
          include: {
            unit: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return tenant;
  }

  async getInvoicesForUser(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) return [];

    const invoices = await this.prisma.invoice.findMany({
      where: {
        contract: {
          tenantId: tenant.id,
        },
      },
      include: {
        contract: {
          include: {
            unit: true,
          },
        },
        payments: {
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            amount: true,
            method: true,
            source: true,
            provider: true,
            providerPaymentId: true,
            rawPayload: true,
            createdAt: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const mappedInvoices = invoices.map((invoice: any) => {
      const amount = this.toNumber(invoice.amount);
      const bankAmount = this.toNumber(invoice.bankAmount);
      const cashAmount = this.toNumber(invoice.cashAmount);

      const confirmedPayments = (invoice.payments || []).filter((payment: any) => payment.status === PaymentStatus.CONFIRMED);
      const pendingPayments = (invoice.payments || []).filter((payment: any) => payment.status === PaymentStatus.PENDING);
      const cancelledPayments = (invoice.payments || []).filter((payment: any) => payment.status === PaymentStatus.CANCELLED);

      const totalPaid = confirmedPayments.reduce((sum: number, payment: any) => sum + this.toNumber(payment.amount), 0);
      const totalRemaining = Math.max(0, amount - totalPaid);

      const derivedStatus: 'PAID' | 'PENDING' | 'OVERDUE' = totalRemaining <= 0
        ? 'PAID'
        : new Date(invoice.dueDate) < now
          ? 'OVERDUE'
          : 'PENDING';

      return {
        id: invoice.id,
        unitName: invoice.contract.unit.name,
        amount,
        bankAmount,
        cashAmount,
        dueDate: invoice.dueDate.toISOString(),
        status: invoice.status,
        derivedStatus,
        totalPaid,
        totalRemaining,
        paymentSummary: {
          total: invoice.payments.length,
          pending: pendingPayments.length,
          confirmed: confirmedPayments.length,
          cancelled: cancelledPayments.length,
          hasPending: pendingPayments.length > 0,
          hasAnyPayments: invoice.payments.length > 0,
        },
        latestPayment: invoice.payments && invoice.payments.length > 0 ? {
          id: invoice.payments[0].id,
          status: invoice.payments[0].status,
          method: invoice.payments[0].method,
          source: (invoice.payments[0] as any).source,
          provider: (invoice.payments[0] as any).provider,
          providerPaymentId: (invoice.payments[0] as any).providerPaymentId,
          rawPayload: (invoice.payments[0] as any).rawPayload,
          createdAt: invoice.payments[0].createdAt?.toISOString?.() || null,
        } : null,
      };
    });

    // Sort by real payment obligation status: OVERDUE > PENDING > PAID
    const statusPriority = { OVERDUE: 0, PENDING: 1, PAID: 2 };
    return mappedInvoices.sort((a, b) => {
      const priorityA = statusPriority[a.derivedStatus] ?? 3;
      const priorityB = statusPriority[b.derivedStatus] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      if (a.derivedStatus === 'PAID') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  async getPaymentsForUser(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) return [];

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          contract: {
            tenantId: tenant.id,
          },
        },
      },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
                unit: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sort by importance: PENDING first, then by date
    const statusPriority = { PENDING: 0, CANCELLED: 1, CONFIRMED: 2 };
    const sortedPayments = [...payments].sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 3;
      const priorityB = statusPriority[b.status] ?? 3;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Within same status, most recent first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedPayments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      method: payment.method,
      source: (payment as any).source,
      provider: (payment as any).provider,
      providerPaymentId: (payment as any).providerPaymentId || null,
      rawPayload: (payment as any).rawPayload || null,
      amount: payment.amount.toNumber(),
      status: payment.status,
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      createdAt: payment.createdAt.toISOString(),
      collectedAt: payment.collectedAt ? payment.collectedAt.toISOString() : null,
      tenantConfirmedAt: (payment as any).tenantConfirmedAt ? new Date((payment as any).tenantConfirmedAt).toISOString() : null,
      tenantConfirmedAmount: (payment as any).tenantConfirmedAmount?.toNumber?.() ?? null,
      collectorReceivedAmount: (payment as any).collectorReceivedAmount?.toNumber?.() ?? null,
      custodyStatus: this.paymentsService.getCashCustodyStatus(payment as any),
      custodySummary: this.paymentsService.getCashCustodySummaryForPayment(payment as any),
      unitName: payment.invoice?.contract?.unit?.name || null,
      invoiceDueDate: payment.invoice?.dueDate ? payment.invoice.dueDate.toISOString() : null,
      invoiceStatus: payment.invoice?.status ?? null,
    }));
  }

  async getPaymentDetail(user: any, paymentId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        invoice: {
          contract: {
            tenantId: tenant.id,
          },
        },
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
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or access denied');
    }

    return {
      id: payment.id,
      amount: payment.amount.toNumber(),
      method: payment.method,
      source: (payment as any).source,
      provider: (payment as any).provider,
      status: payment.status,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      collectedAt: payment.collectedAt,
      tenantConfirmedAt: (payment as any).tenantConfirmedAt ?? null,
      tenantConfirmedAmount: (payment as any).tenantConfirmedAmount?.toNumber?.() ?? null,
      collectorReceivedAmount: (payment as any).collectorReceivedAmount?.toNumber?.() ?? null,
      custodyStatus: this.paymentsService.getCashCustodyStatus(payment as any),
      custodySummary: this.paymentsService.getCashCustodySummaryForPayment(payment as any),
      invoice: {
        id: payment.invoice.id,
        amount: payment.invoice.amount.toNumber(),
        dueDate: payment.invoice.dueDate,
        status: payment.invoice.status,
        unitName: payment.invoice.contract.unit.name,
        contractId: payment.invoice.contract.id,
      },
    };
  }

  async confirmCashGiven(user: any, paymentId: string, dto: ConfirmCashDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.paymentsService.tenantConfirmCashGiven(paymentId, tenant.id, dto);
  }

  async getBalanceForUser(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
      include: { balance: true },
    });

    if (!tenant || !tenant.balance) {
      return { current: 0 };
    }

    return {
      current: tenant.balance.current,
    };
  }

  async registerDevice(user: any, dto: RegisterDeviceDto) {
    // Find tenant by id
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Upsert device: if token exists, update; otherwise create
    const device = await this.prisma.tenantDevice.upsert({
      where: { fcmToken: dto.fcmToken },
      update: {
        tenantId: tenant.id,
        platform: dto.platform,
      },
      create: {
        tenantId: tenant.id,
        fcmToken: dto.fcmToken,
        platform: dto.platform,
      },
    });

    this.logger.log(`📱 Device registered for tenant ${tenant.fullName}: ${dto.platform}, token: ${dto.fcmToken.substring(0, 20)}...`);

    return {
      success: true,
      deviceId: device.id,
      message: 'Device registered successfully for push notifications',
    };
  }

  async getDevices(user: any) {
    // Find tenant by id
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get all devices for this tenant
    const devices = await this.prisma.tenantDevice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      devices: devices.map((d) => ({
        id: d.id,
        fcmToken: d.fcmToken,
        platform: d.platform,
        createdAt: d.createdAt,
      })),
    };
  }

  async createPaymentIntent(user: any, dto: PaymentIntentDto) {
    throw new ForbiddenException('Tenant portal orqali to‘lov qilish o‘chirildi. To‘lov kassir tomonidan bank yoki naqd orqali kiritiladi.');
  }

  async refreshPaymentStatus(user: any, paymentId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        invoice: { contract: { tenantId: tenant.id } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if ((payment as any).provider !== PaymentProvider.UZUM) {
      return { ok: false, error: 'Payment provider is not CheckoutUz' };
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      return { ok: true, alreadyConfirmed: true };
    }

    return this.paymentsService.refreshCheckoutUzPayment(payment.id);
  }

  async getNotificationPreferences(user: any) {
    // Find tenant by id
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get all preferences for this tenant
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { tenantId: tenant.id },
    });

    // If no preferences exist, return defaults (all enabled)
    if (preferences.length === 0) {
      return {
        preferences: [
          { channel: 'EMAIL', enabled: true },
          { channel: 'TELEGRAM', enabled: true },
          { channel: 'PUSH', enabled: true },
          { channel: 'SMS', enabled: true },
        ],
      };
    }

    // Return existing preferences
    return {
      preferences: preferences.map((p) => ({
        channel: p.channel,
        enabled: p.enabled,
      })),
    };
  }

  async updateNotificationPreferences(user: any, dto: UpdateNotificationPreferencesDto) {
    // Find tenant by id
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Upsert each preference
    const updatePromises = dto.preferences.map((pref) =>
      this.prisma.notificationPreference.upsert({
        where: {
          tenantId_channel: {
            tenantId: tenant.id,
            channel: pref.channel,
          },
        },
        update: {
          enabled: pref.enabled,
        },
        create: {
          tenantId: tenant.id,
          channel: pref.channel,
          enabled: pref.enabled,
        },
      }),
    );

    await Promise.all(updatePromises);

    this.logger.log(`Updated notification preferences for tenant ${tenant.fullName}`);

    return {
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: dto.preferences,
    };
  }

  // ===== RECEIPTS =====

  async getReceiptData(user: any, paymentId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

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

    // Verify this payment belongs to the tenant
    if (payment.invoice.contract.tenantId !== tenant.id) {
      throw new ForbiddenException('Access denied');
    }

    if (payment.status !== 'CONFIRMED') {
      throw new NotFoundException('Receipt only available for confirmed payments');
    }

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

  async getPaymentChartData(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          contract: {
            tenantId: tenant.id,
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
          tenantId: tenant.id,
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

  // ===== DOCUMENTS =====

  async getDocuments(user: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get all documents from Document table
    const documents = await this.prisma.document.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });

    // Get contract PDFs (filter out contracts without PDFs)
    const allContracts = await this.prisma.contract.findMany({
      where: { 
        tenantId: tenant.id,
      },
      select: {
        id: true,
        pdfUrl: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        unit: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Filter contracts that have PDF URLs
    const contracts = allContracts.filter(contract => contract.pdfUrl && contract.pdfUrl.trim() !== '');

    // Get payment receipts (from confirmed payments)
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          contract: {
            tenantId: tenant.id,
          },
        },
        status: 'CONFIRMED',
      },
      include: {
        invoice: {
          include: {
            contract: {
              include: {
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
      orderBy: { paidAt: 'desc' },
    });

    // Combine all documents
    const allDocuments: any[] = [];

    // Add contract PDFs as documents
    contracts.forEach((contract) => {
      if (contract.pdfUrl) {
        allDocuments.push({
          id: `contract-${contract.id}`,
          type: 'LEASE_AGREEMENT',
          name: `Shartnoma - ${contract.unit?.name || 'Noma\'lum'}`,
          fileUrl: contract.pdfUrl,
          fileSize: null,
          mimeType: 'application/pdf',
          createdAt: contract.createdAt,
        });
      }
    });

    // Add payment receipts
    payments.forEach((payment) => {
      allDocuments.push({
        id: `receipt-${payment.id}`,
        type: 'PAYMENT_RECEIPT',
        name: `To'lov kvitansiyasi - ${payment.invoice.contract.unit?.name || 'Noma\'lum'}`,
        fileUrl: `/api/tenant/receipts/payment/${payment.id}`, // Tenant portal receipt endpoint
        fileSize: null,
        mimeType: 'application/pdf',
        createdAt: payment.paidAt || payment.createdAt,
      });
    });

    // Add regular documents
    documents.forEach((doc) => {
      allDocuments.push({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        createdAt: doc.createdAt,
      });
    });

    // Sort by creation date (newest first)
    return allDocuments.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }
}
