import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

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
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const tenant = await this.prisma.tenant.create({ 
        data: {
          ...dto,
          password: hashedPassword
        }
      });
      
      return {
        id: tenant.id,
        fullName: tenant.fullName,
        email: tenant.email || '',
        phone: tenant.phone,
        createdAt: tenant.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already exists' });
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    
    // If password is provided, hash it before updating
    const updateData: Prisma.TenantUpdateInput = { ...dto };
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

    // Automatically archive all related data in cascade order
    const archiveReason = reason || 'Archived along with tenant';

    // 1. Archive all payments (through invoices)
    await this.prisma.payment.updateMany({
      where: {
        invoice: {
          contract: {
            tenantId: id,
            isArchived: false,
          },
        },
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId,
        archiveReason,
      },
    });

    // 2. Archive all invoices
    await this.prisma.invoice.updateMany({
      where: {
        contract: {
          tenantId: id,
          isArchived: false,
        },
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId,
        archiveReason,
      },
    });

    // 3. Archive all contracts
    await this.prisma.contract.updateMany({
      where: {
        tenantId: id,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId,
        archiveReason,
      },
    });

    // 4. Archive all conversations (move to archived_conversations table)
    const tenantConversations = await this.prisma.conversation.findMany({
      where: { tenantId: id },
      include: { messages: true },
    });

    for (const conversation of tenantConversations) {
      // Archive conversation
      await this.prisma.archivedConversation.create({
        data: {
          originalId: conversation.id,
          tenantId: conversation.tenantId,
          adminId: conversation.adminId,
          topic: conversation.topic,
          status: conversation.status,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          archivedAt: new Date(),
          archivedBy: adminId,
          archiveReason,
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
      }

      // Delete the original conversation (cascade will delete messages)
      await this.prisma.conversation.delete({ where: { id: conversation.id } });
    }

    // 5. Archive the tenant
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId,
        archiveReason: reason || 'Archived by admin',
      },
    });
  }

  async unarchive(id: string) {
    const tenant = await this.findOne(id);

    if (!tenant.isArchived) {
      throw new ConflictException('Tenant is not archived');
    }

    // Automatically unarchive all related data in reverse cascade order

    // 1. Unarchive all contracts
    await this.prisma.contract.updateMany({
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

    // 2. Unarchive all invoices
    await this.prisma.invoice.updateMany({
      where: {
        contract: {
          tenantId: id,
          isArchived: true,
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

    // 3. Unarchive all payments
    await this.prisma.payment.updateMany({
      where: {
        invoice: {
          contract: {
            tenantId: id,
            isArchived: true,
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

    // 4. Unarchive the tenant
    return this.prisma.tenant.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
      },
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

    // Delete balance if it exists (one-to-one relationship)
    await this.prisma.balance.deleteMany({
      where: { tenantId: id },
    });

    // Conversations will be automatically deleted due to onDelete: Cascade
    // Delete the tenant
    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}


