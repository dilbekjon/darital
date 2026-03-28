import { ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SmsService } from '../sms/sms.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  private normalizePhone(rawPhone: string): string {
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      return rawPhone;
    }
    return cleanPhone.startsWith('998') ? cleanPhone : `998${cleanPhone}`;
  }

  async findAll(includeArchived = false) {
    const tenants = await this.prisma.tenant.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        isArchived: true,
        archivedAt: true,
        archivedBy: true,
        archiveReason: true,
      },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email || '',
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
      isArchived: tenant.isArchived,
      archivedAt: tenant.archivedAt?.toISOString(),
      archivedBy: tenant.archivedBy,
      archiveReason: tenant.archiveReason,
    }));
  }

  async findArchived() {
    const tenants = await this.prisma.tenant.findMany({
      where: { isArchived: true },
      orderBy: { archivedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
        archivedAt: true,
        archivedBy: true,
        archiveReason: true,
      },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email || '',
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
      archivedAt: tenant.archivedAt?.toISOString() || '',
      archivedBy: tenant.archivedBy || '',
      archiveReason: tenant.archiveReason,
    }));
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(dto: CreateTenantDto) {
    try {
      const normalizedPhone = this.normalizePhone(dto.phone);
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const tenant = await this.prisma.tenant.create({
        data: {
          fullName: dto.fullName,
          phone: normalizedPhone,
          password: hashedPassword,
        },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const baseUrl = process.env.TENANT_SETUP_BASE_URL || 'https://darital-arenda.uz';
      const setupUrl = `${baseUrl}/setup?phone=${encodeURIComponent(dto.phone)}&token=${token}`;

      await this.prisma.tenantSetupToken.create({
        data: {
          tenantId: tenant.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const smsResult = await this.smsService.sendTenantSetupLink(dto.phone, dto.fullName, setupUrl);
      if (!smsResult.success) {
        this.logger.warn(`SMS not sent to ${dto.phone}: ${smsResult.error}. Setup link: ${setupUrl}`);
      }

      return {
        id: tenant.id,
        fullName: tenant.fullName,
        email: tenant.email || '',
        phone: tenant.phone,
        createdAt: tenant.createdAt.toISOString(),
        smsSent: smsResult.success,
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Phone number already exists' });
      }
      throw err;
    }
  }

  async sendResetPasswordSms(tenantId: string) {
    const tenant = await this.findOne(tenantId);
    const token = crypto.randomBytes(32).toString('hex');
    const baseUrl = process.env.TENANT_SETUP_BASE_URL || 'https://darital-arenda.uz';
    const setupUrl = `${baseUrl}/setup?phone=${encodeURIComponent(tenant.phone)}&token=${token}`;
    await this.prisma.tenantSetupToken.create({
      data: {
        tenantId: tenant.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const smsResult = await this.smsService.sendTenantSetupLink(tenant.phone, tenant.fullName, setupUrl);
    if (!smsResult.success) {
      this.logger.warn(`SMS not sent to ${tenant.phone}: ${smsResult.error}. Setup link (send to tenant manually): ${setupUrl}`);
      return {
        success: false,
        message: smsResult.error === 'SMS not configured'
          ? 'SMS not configured (set SMS_PROVIDER and provider credentials such as DEVSMS_TOKEN)'
          : 'SMS failed',
        setupLink: setupUrl,
      };
    }
    return { success: true, message: 'SMS sent' };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    
    // If password is provided, hash it before updating
    const updateData: Prisma.TenantUpdateInput = { ...dto };
    if (dto.phone) {
      updateData.phone = this.normalizePhone(dto.phone);
    }
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    } else {
      // Remove password from updateData if not provided
      delete (updateData as any).password;
    }
    
    const tenant = await this.prisma.tenant.update({ where: { id }, data: updateData });

    return {
      id: tenant.id,
      fullName: tenant.fullName,
      email: tenant.email || '',
      phone: tenant.phone,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  async archive(id: string, adminId: string, reason?: string) {
    const tenant = await this.findOne(id);

    if (tenant.isArchived) {
      throw new ConflictException('Tenant is already archived');
    }

    const archiveReason = reason || 'Archived along with tenant';
    const archivedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: {
          invoice: {
            contract: {
              tenantId: id,
            },
          },
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason,
        },
      });

      await tx.invoice.updateMany({
        where: {
          contract: {
            tenantId: id,
          },
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason,
        },
      });

      await tx.contract.updateMany({
        where: {
          tenantId: id,
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason,
        },
      });

      const tenantConversations = await tx.conversation.findMany({
        where: { tenantId: id },
        include: { messages: true },
      });

      for (const conversation of tenantConversations) {
        const archivedConversation = await tx.archivedConversation.create({
          data: {
            originalId: conversation.id,
            tenantId: conversation.tenantId,
            adminId: conversation.adminId,
            topic: conversation.topic,
            status: conversation.status,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            archivedAt,
            archivedBy: adminId,
            archiveReason,
          },
        });

        for (const message of conversation.messages) {
          await tx.archivedMessage.create({
            data: {
              originalId: message.id,
              conversationId: archivedConversation.id,
              senderRole: message.senderRole,
              senderId: message.senderId,
              content: message.content,
              fileUrl: message.fileUrl,
              status: message.status,
              createdAt: message.createdAt,
              archivedAt,
            },
          });
        }

        await tx.conversation.delete({ where: { id: conversation.id } });
      }

      return tx.tenant.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt,
          archivedBy: adminId,
          archiveReason: reason || 'Archived by admin',
        },
      });
    });
  }

  async unarchive(id: string) {
    const tenant = await this.findOne(id);

    if (!tenant.isArchived) {
      throw new ConflictException('Tenant is not archived');
    }

    return this.prisma.$transaction(async (tx) => {
      const archivedConversations = await tx.archivedConversation.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: 'asc' },
      });

      for (const archivedConversation of archivedConversations) {
        const archivedMessages = await tx.archivedMessage.findMany({
          where: {
            OR: [
              { conversationId: archivedConversation.id },
              { conversationId: archivedConversation.originalId },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });

        const existingConversation = await tx.conversation.findUnique({
          where: { id: archivedConversation.originalId },
          select: { id: true },
        });

        if (!existingConversation) {
          await tx.conversation.create({
            data: {
              id: archivedConversation.originalId,
              tenantId: archivedConversation.tenantId,
              adminId: archivedConversation.adminId,
              topic: archivedConversation.topic,
              status: archivedConversation.status,
              createdAt: archivedConversation.createdAt,
              updatedAt: archivedConversation.updatedAt,
            },
          });
        }

        for (const archivedMessage of archivedMessages) {
          const existingMessage = await tx.message.findUnique({
            where: { id: archivedMessage.originalId },
            select: { id: true },
          });

          if (!existingMessage) {
            await tx.message.create({
              data: {
                id: archivedMessage.originalId,
                conversationId: archivedConversation.originalId,
                senderRole: archivedMessage.senderRole,
                senderId: archivedMessage.senderId,
                content: archivedMessage.content,
                fileUrl: archivedMessage.fileUrl,
                status: archivedMessage.status,
                createdAt: archivedMessage.createdAt,
              },
            });
          }
        }

        await tx.archivedMessage.deleteMany({
          where: {
            OR: [
              { conversationId: archivedConversation.id },
              { conversationId: archivedConversation.originalId },
            ],
          },
        });
        await tx.archivedConversation.delete({ where: { id: archivedConversation.id } });
      }

      await tx.payment.updateMany({
        where: {
          invoice: {
            contract: {
              tenantId: id,
            },
          },
          isArchived: true,
        },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });

      await tx.invoice.updateMany({
        where: {
          contract: {
            tenantId: id,
          },
          isArchived: true,
        },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });

      await tx.contract.updateMany({
        where: {
          tenantId: id,
          isArchived: true,
        },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });

      return tx.tenant.update({
        where: { id },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
          archiveReason: null,
        },
      });
    });
  }

  async remove(id: string) {
    const tenant = await this.findOne(id); // Check if exists

    if (!tenant.isArchived) {
      throw new ConflictException('Cannot delete tenant that is not archived. Please archive first.');
    }

    // Check if tenant has any contracts (archived or not)
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId: id },
    });

    if (contracts.length > 0) {
      throw new ConflictException('Cannot delete tenant with existing contracts. Please delete contracts first.');
    }

    return this.prisma.$transaction(async (tx) => {
      const archivedConversationIds = (
        await tx.archivedConversation.findMany({
          where: { tenantId: id },
          select: { id: true, originalId: true },
        })
      ).flatMap((conversation) => [conversation.id, conversation.originalId]);

      if (archivedConversationIds.length > 0) {
        await tx.archivedMessage.deleteMany({
          where: {
            conversationId: { in: archivedConversationIds },
          },
        });
      }

      await tx.archivedConversation.deleteMany({ where: { tenantId: id } });

      await tx.balance.deleteMany({
        where: { tenantId: id },
      });

      return tx.tenant.delete({
        where: { id },
      });
    });
  }
}
