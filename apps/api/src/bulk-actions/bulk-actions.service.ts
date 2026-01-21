import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BulkActionsService {
  private readonly logger = new Logger(BulkActionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Bulk update invoice status
  async bulkUpdateInvoiceStatus(invoiceIds: string[], status: 'PENDING' | 'PAID' | 'OVERDUE') {
    if (!invoiceIds.length) {
      throw new BadRequestException('No invoice IDs provided');
    }

    const result = await this.prisma.invoice.updateMany({
      where: { id: { in: invoiceIds } },
      data: { status },
    });

    this.logger.log(`Bulk updated ${result.count} invoices to status ${status}`);
    return { updated: result.count };
  }

  // Bulk update payment status
  async bulkUpdatePaymentStatus(paymentIds: string[], status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') {
    if (!paymentIds.length) {
      throw new BadRequestException('No payment IDs provided');
    }

    const data: any = { status };
    if (status === 'CONFIRMED') {
      data.paidAt = new Date();
    }

    const result = await this.prisma.payment.updateMany({
      where: { id: { in: paymentIds } },
      data,
    });

    this.logger.log(`Bulk updated ${result.count} payments to status ${status}`);
    return { updated: result.count };
  }

  // Bulk delete notifications
  async bulkDeleteNotifications(notificationIds: string[], tenantId: string) {
    if (!notificationIds.length) {
      throw new BadRequestException('No notification IDs provided');
    }

    const result = await this.prisma.inAppNotification.deleteMany({
      where: {
        id: { in: notificationIds },
        tenantId,
      },
    });

    return { deleted: result.count };
  }

  // Bulk update contract status
  async bulkUpdateContractStatus(
    contractIds: string[],
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  ) {
    if (!contractIds.length) {
      throw new BadRequestException('No contract IDs provided');
    }

    const result = await this.prisma.contract.updateMany({
      where: { id: { in: contractIds } },
      data: { status },
    });

    this.logger.log(`Bulk updated ${result.count} contracts to status ${status}`);
    return { updated: result.count };
  }

  // Bulk update unit status
  async bulkUpdateUnitStatus(unitIds: string[], status: 'FREE' | 'BUSY' | 'MAINTENANCE') {
    if (!unitIds.length) {
      throw new BadRequestException('No unit IDs provided');
    }

    const result = await this.prisma.unit.updateMany({
      where: { id: { in: unitIds } },
      data: { status },
    });

    this.logger.log(`Bulk updated ${result.count} units to status ${status}`);
    return { updated: result.count };
  }

  // Bulk assign units to building
  async bulkAssignUnitsToBuilding(unitIds: string[], buildingId: string | null) {
    if (!unitIds.length) {
      throw new BadRequestException('No unit IDs provided');
    }

    const result = await this.prisma.unit.updateMany({
      where: { id: { in: unitIds } },
      data: { buildingId },
    });

    this.logger.log(`Bulk assigned ${result.count} units to building ${buildingId || 'none'}`);
    return { updated: result.count };
  }

  // Bulk send notifications
  async bulkCreateNotifications(
    tenantIds: string[],
    notification: { type: string; title: string; message: string; data?: any }
  ) {
    if (!tenantIds.length) {
      throw new BadRequestException('No tenant IDs provided');
    }

    const result = await this.prisma.inAppNotification.createMany({
      data: tenantIds.map((tenantId) => ({
        tenantId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      })),
    });

    this.logger.log(`Bulk created ${result.count} notifications`);
    return { created: result.count };
  }
}
