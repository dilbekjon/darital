import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export type NotificationType = 
  | 'PAYMENT_DUE'
  | 'PAYMENT_CONFIRMED'
  | 'CONTRACT_EXPIRING'
  | 'MESSAGE'
  | 'SYSTEM';

interface CreateNotificationDto {
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.inAppNotification.create({
      data: {
        tenantId: dto.tenantId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
      },
    });

    this.logger.log(`Created in-app notification for tenant ${dto.tenantId}: ${dto.title}`);
    return notification;
  }

  async createMany(notifications: CreateNotificationDto[]) {
    return this.prisma.inAppNotification.createMany({
      data: notifications.map((n) => ({
        tenantId: n.tenantId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
      })),
    });
  }

  async getForTenant(tenantId: string, options?: { limit?: number; unreadOnly?: boolean }) {
    const limit = options?.limit || 50;
    const where: any = { tenantId };

    if (options?.unreadOnly) {
      where.read = false;
    }

    return this.prisma.inAppNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(tenantId: string) {
    return this.prisma.inAppNotification.count({
      where: { tenantId, read: false },
    });
  }

  async markAsRead(notificationId: string, tenantId: string) {
    return this.prisma.inAppNotification.updateMany({
      where: { id: notificationId, tenantId },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllAsRead(tenantId: string) {
    return this.prisma.inAppNotification.updateMany({
      where: { tenantId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  async delete(notificationId: string, tenantId: string) {
    return this.prisma.inAppNotification.deleteMany({
      where: { id: notificationId, tenantId },
    });
  }

  async deleteOld(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.inAppNotification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true,
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);
    return result;
  }

  // Helper to create payment-related notifications
  async notifyPaymentDue(tenantId: string, invoiceId: string, amount: number, dueDate: Date) {
    return this.create({
      tenantId,
      type: 'PAYMENT_DUE',
      title: 'Payment Due',
      message: `Your payment of ${amount.toLocaleString()} UZS is due on ${dueDate.toLocaleDateString()}`,
      data: { invoiceId, amount, dueDate: dueDate.toISOString() },
    });
  }

  async notifyPaymentConfirmed(tenantId: string, paymentId: string, amount: number) {
    return this.create({
      tenantId,
      type: 'PAYMENT_CONFIRMED',
      title: 'Payment Confirmed',
      message: `Your payment of ${amount.toLocaleString()} UZS has been confirmed. Thank you!`,
      data: { paymentId, amount },
    });
  }

  async notifyContractExpiring(tenantId: string, contractId: string, endDate: Date) {
    return this.create({
      tenantId,
      type: 'CONTRACT_EXPIRING',
      title: 'Contract Expiring Soon',
      message: `Your contract will expire on ${endDate.toLocaleDateString()}. Please contact management for renewal.`,
      data: { contractId, endDate: endDate.toISOString() },
    });
  }

  async notifyNewMessage(tenantId: string, conversationId: string, preview: string) {
    return this.create({
      tenantId,
      type: 'MESSAGE',
      title: 'New Message',
      message: preview.substring(0, 100) + (preview.length > 100 ? '...' : ''),
      data: { conversationId },
    });
  }
}
