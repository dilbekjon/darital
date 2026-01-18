import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { PaymentIntentDto, PaymentProviderEnum } from '../payments/dto/payment-intent.dto';
import { PaymentMethod, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { CheckoutUzService } from '../payments/checkout-uz.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class TenantPortalService {
  private readonly logger = new Logger(TenantPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutUzService: CheckoutUzService,
    private readonly paymentsService: PaymentsService,
  ) {}

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
      },
      orderBy: { dueDate: 'asc' },
    });

    return invoices.map((invoice) => ({
      id: invoice.id,
      unitName: invoice.contract.unit.name,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
    }));
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
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      method: payment.method,
      provider: (payment as any).provider,
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
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
      amount: payment.amount,
      method: payment.method,
      provider: (payment as any).provider,
      status: payment.status,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      invoice: {
        id: payment.invoice.id,
        amount: payment.invoice.amount,
        dueDate: payment.invoice.dueDate,
        status: payment.invoice.status,
        unitName: payment.invoice.contract.unit.name,
        contractId: payment.invoice.contract.id,
      },
    };
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
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.id },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, contract: { tenantId: tenant.id } },
      include: { contract: true },
    });
    if (!invoice) throw new ForbiddenException('Invoice not found or access denied');
    if (invoice.status === 'PAID') {
      throw new ConflictException('Invoice already paid');
    }

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        method: PaymentMethod.ONLINE,
        provider: dto.provider ?? PaymentProviderEnum.NONE,
        status: PaymentStatus.PENDING,
        amount: invoice.amount,
        externalRef: invoice.id,
      } as any,
    });

    if (dto.provider === PaymentProviderEnum.UZUM) {
      try {
        const checkoutResponse = await this.checkoutUzService.createInvoice(invoice.amount);
        if (!checkoutResponse?.ok || !checkoutResponse.order_id || !checkoutResponse.pay_url) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CANCELLED,
              rawPayload: checkoutResponse ?? { error: 'Invalid response from CheckoutUz' },
            } as any,
          });
          throw new Error('Failed to create CheckoutUz invoice');
        }

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            provider: PaymentProvider.UZUM,
            providerPaymentId: String(checkoutResponse.order_id),
            rawPayload: checkoutResponse,
          } as any,
        });

        return {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: payment.amount,
          provider: PaymentProvider.UZUM,
          providerPaymentId: String(checkoutResponse.order_id),
          checkoutUrl: checkoutResponse.pay_url,
        };
      } catch (error: any) {
        this.logger.error(`CheckoutUz create invoice failed: ${error?.message || error}`);
        throw new ConflictException('Unable to create payment intent. Please try again later.');
      }
    }

    return {
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount: payment.amount,
      provider: (payment as any).provider,
      checkoutUrl: null,
    };
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
}
