import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class TenantPortalService {
  private readonly logger = new Logger(TenantPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfileForUser(user: any) {
    // For TENANT role users, find tenant by email match
    // For ADMIN/SUPER_ADMIN, they can debug but we'll still try to find a tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
      include: {
        contracts: {
          // Include ALL contracts (DRAFT, ACTIVE, COMPLETED, CANCELLED)
          // Frontend will show status so tenant can see all their contracts
          include: {
            unit: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return tenant;
  }

  async getInvoicesForUser(user: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
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
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
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
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
    }));
  }

  async getPaymentDetail(user: any, paymentId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
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
      throw new Error('Payment not found or access denied');
    }

    return {
      id: payment.id,
      amount: payment.amount,
      method: payment.method,
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
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
      include: {
        balance: true,
      },
    });

    if (!tenant || !tenant.balance) {
      return { current: 0 };
    }

    return {
      current: tenant.balance.current,
    };
  }

  async registerDevice(user: any, dto: RegisterDeviceDto) {
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
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
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
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

  async getNotificationPreferences(user: any) {
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
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
    // Find tenant by email
    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
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
