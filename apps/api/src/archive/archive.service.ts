import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface ArchiveStats {
  tenants: { active: number; archived: number };
  contracts: { active: number; archived: number };
  invoices: { active: number; archived: number };
  conversations: { active: number; archived: number };
  messages: { archived: number };
  auditLogs: { archived: number };
  notifications: { archived: number };
}

export interface ArchiveSummary {
  stats: ArchiveStats;
  lastArchiveDate?: Date;
  totalArchivedSize: number; // Estimated in MB
}

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get archive statistics and summary
   */
  async getArchiveSummary(): Promise<ArchiveSummary> {
    const [
      activeTenants,
      archivedTenants,
      activeContracts,
      archivedContracts,
      activeInvoices,
      archivedInvoices,
      activeConversations,
      archivedConversations,
      archivedMessages,
      archivedAuditLogs,
      archivedNotifications,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: { isArchived: false } }),
      this.prisma.tenant.count({ where: { isArchived: true } }),
      this.prisma.contract.count({ where: { isArchived: false } }),
      this.prisma.contract.count({ where: { isArchived: true } }),
      this.prisma.invoice.count({ where: { isArchived: false } }),
      this.prisma.invoice.count({ where: { isArchived: true } }),
      this.prisma.conversation.count({ where: { status: { in: ['OPEN', 'PENDING'] } } }),
      this.prisma.archivedConversation.count(),
      this.prisma.archivedMessage.count(),
      this.prisma.archivedAuditLog.count(),
      this.prisma.archivedNotification.count(),
    ]);

    // Get last archive operation
    const lastArchivedConversation = await this.prisma.archivedConversation.findFirst({
      orderBy: { archivedAt: 'desc' },
      select: { archivedAt: true },
    });

    // Estimate total archived size (rough calculation)
    const totalArchivedSize =
      archivedConversations * 0.5 + // ~0.5MB per archived conversation
      archivedMessages * 0.1 + // ~0.1MB per archived message
      archivedAuditLogs * 0.05 + // ~0.05MB per audit log
      archivedNotifications * 0.02; // ~0.02MB per notification

    return {
      stats: {
        tenants: { active: activeTenants, archived: archivedTenants },
        contracts: { active: activeContracts, archived: archivedContracts },
        invoices: { active: activeInvoices, archived: archivedInvoices },
        conversations: { active: activeConversations, archived: archivedConversations },
        messages: { archived: archivedMessages },
        auditLogs: { archived: archivedAuditLogs },
        notifications: { archived: archivedNotifications },
      },
      lastArchiveDate: lastArchivedConversation?.archivedAt,
      totalArchivedSize: Math.round(totalArchivedSize * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Archive old operational data automatically
   */
  async runAutoArchive(): Promise<{
    conversationsArchived: number;
    messagesArchived: number;
    auditLogsArchived: number;
    notificationsArchived: number;
  }> {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

    this.logger.log('Starting automatic archive process...');

    // Archive old closed conversations (older than 1 year)
    const oldConversations = await this.prisma.conversation.findMany({
      where: {
        status: 'CLOSED',
        updatedAt: { lt: oneYearAgo },
      },
      include: { messages: true },
    });

    let conversationsArchived = 0;
    let messagesArchived = 0;

    for (const conversation of oldConversations) {
      await this.prisma.archivedConversation.create({
        data: {
          originalId: conversation.id,
          tenantId: conversation.tenantId,
          adminId: conversation.adminId,
          topic: conversation.topic,
          status: conversation.status,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          archivedBy: 'system', // System auto-archive
          archiveReason: 'Automatic archive after retention period',
        },
      });

      // Archive all messages from this conversation
      for (const message of conversation.messages) {
        await this.prisma.archivedMessage.create({
          data: {
            originalId: message.id,
            conversationId: conversation.id,
            senderRole: message.senderRole,
            senderId: message.senderId,
            content: message.content,
            fileUrl: message.fileUrl,
            status: message.status,
            createdAt: message.createdAt,
          },
        });
        messagesArchived++;
      }

      // Delete the original conversation (cascade will delete messages)
      await this.prisma.conversation.delete({ where: { id: conversation.id } });
      conversationsArchived++;
    }

    // Archive old audit logs (older than 2 years)
    const oldAuditLogs = await this.prisma.adminAuditLog.findMany({
      where: { createdAt: { lt: twoYearsAgo } },
    });

    let auditLogsArchived = 0;
    for (const log of oldAuditLogs) {
      await this.prisma.archivedAuditLog.create({
        data: {
          originalId: log.id,
          actorId: log.actorId,
          action: log.action,
          subject: log.subject,
          meta: log.meta,
          createdAt: log.createdAt,
        },
      });
      await this.prisma.adminAuditLog.delete({ where: { id: log.id } });
      auditLogsArchived++;
    }

    // Archive old notifications (older than 6 months)
    const oldNotifications = await this.prisma.inAppNotification.findMany({
      where: {
        createdAt: { lt: sixMonthsAgo },
        read: true, // Only archive read notifications
      },
    });

    let notificationsArchived = 0;
    for (const notification of oldNotifications) {
      await this.prisma.archivedNotification.create({
        data: {
          originalId: notification.id,
          tenantId: notification.tenantId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt,
        },
      });
      await this.prisma.inAppNotification.delete({ where: { id: notification.id } });
      notificationsArchived++;
    }

    this.logger.log(`Archive process completed: ${conversationsArchived} conversations, ${messagesArchived} messages, ${auditLogsArchived} audit logs, ${notificationsArchived} notifications`);

    return {
      conversationsArchived,
      messagesArchived,
      auditLogsArchived,
      notificationsArchived,
    };
  }

  /**
   * Get archived conversations with pagination
   */
  async getArchivedConversations(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.archivedConversation.findMany({
        skip,
        take: limit,
        orderBy: { archivedAt: 'desc' },
      }),
      this.prisma.archivedConversation.count(),
    ]);

    // Add message counts manually
    const conversationsWithCounts = await Promise.all(
      conversations.map(async (conv) => ({
        ...conv,
        _count: {
          messages: await this.prisma.archivedMessage.count({
            where: { conversationId: conv.id },
          }),
        },
      }))
    );

    return {
      data: conversationsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get archived messages for a conversation
   */
  async getArchivedMessages(conversationId: string) {
    return this.prisma.archivedMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Restore an archived conversation (for admin review)
   */
  async restoreArchivedConversation(archivedId: string) {
    const archived = await this.prisma.archivedConversation.findUnique({
      where: { id: archivedId },
    });

    if (!archived) {
      throw new BadRequestException('Archived conversation not found');
    }

    // Get all archived messages for this conversation
    const archivedMessages = await this.prisma.archivedMessage.findMany({
      where: { conversationId: archivedId },
    });

    // Restore conversation
    const restoredConversation = await this.prisma.conversation.create({
      data: {
        id: archived.originalId,
        tenantId: archived.tenantId,
        adminId: archived.adminId,
        topic: archived.topic,
        status: archived.status,
        createdAt: archived.createdAt,
        updatedAt: archived.updatedAt,
      },
    });

    // Restore messages
    for (const message of archivedMessages) {
      await this.prisma.message.create({
        data: {
          id: message.originalId,
          conversationId: restoredConversation.id,
          senderRole: message.senderRole,
          senderId: message.senderId,
          content: message.content,
          fileUrl: message.fileUrl,
          status: message.status,
          createdAt: message.createdAt,
        },
      });
    }

    // Delete from archive
    await Promise.all([
      this.prisma.archivedMessage.deleteMany({ where: { conversationId: archivedId } }),
      this.prisma.archivedConversation.delete({ where: { id: archivedId } }),
    ]);

    return restoredConversation;
  }

  /**
   * Permanently delete archived data older than specified days
   */
  async cleanupOldArchives(olderThanDays: number) {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const [conversationsDeleted, messagesDeleted, auditLogsDeleted, notificationsDeleted] = await Promise.all([
      this.prisma.archivedConversation.deleteMany({
        where: { archivedAt: { lt: cutoffDate } },
      }),
      this.prisma.archivedMessage.deleteMany({
        where: { archivedAt: { lt: cutoffDate } },
      }),
      this.prisma.archivedAuditLog.deleteMany({
        where: { archivedAt: { lt: cutoffDate } },
      }),
      this.prisma.archivedNotification.deleteMany({
        where: { archivedAt: { lt: cutoffDate } },
      }),
    ]);

    this.logger.log(`Cleaned up old archives: ${conversationsDeleted.count} conversations, ${messagesDeleted.count} messages, ${auditLogsDeleted.count} audit logs, ${notificationsDeleted.count} notifications`);

    return {
      conversationsDeleted: conversationsDeleted.count,
      messagesDeleted: messagesDeleted.count,
      auditLogsDeleted: auditLogsDeleted.count,
      notificationsDeleted: notificationsDeleted.count,
    };
  }
}