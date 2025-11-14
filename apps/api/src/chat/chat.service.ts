import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AdminRole, SenderRole } from '@prisma/client'; // Import AdminRole and SenderRole

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper: Resolve Tenant record from authenticated User
   * Links User → Tenant by email (since they're separate tables)
   */
  async resolveTenantForUser(user: any) {
    const email = user.email;
    if (!email) {
      throw new ForbiddenException({
        code: 'NO_EMAIL',
        message: 'User email not found in token',
      });
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
    });

    if (!tenant) {
      console.error(`[ChatService] No tenant found for user email: ${email}`);
      throw new NotFoundException({
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant profile not linked to this user. Please ensure tenant account exists.',
      });
    }

    console.log(`[ChatService] Resolved tenant ${tenant.id} for user ${user.sub} (${email})`);
    return tenant;
  }

  /**
   * Create a new conversation (tenant starts chat)
   * Reuses existing OPEN conversation if available
   * Now properly resolves User → Tenant relationship
   */
  async createConversationForUser(user: any, dto: CreateConversationDto) {
    try {
      const role = user.role; // Use the AdminRole directly
      console.log(`[ChatService] Creating conversation - User: ${user.email}, Role: ${role}`);
      
      if (role !== AdminRole.TENANT_USER) {
        throw new ForbiddenException({
          code: 'ROLE_NOT_ALLOWED',
          message: 'Only tenant users can start support conversations',
        });
      }

      // Resolve the actual Tenant record
      const tenant = await this.resolveTenantForUser(user);
      const tenantId = tenant.id;

      console.log(`[ChatService] Creating conversation for tenant: ${tenantId}, Topic: ${dto.topic || 'General'}`);
      
      // Build where clause for existing conversation check
      const whereClause: any = {
        tenantId,
        status: { in: ['PENDING', 'OPEN'] },
      };
      
      // If topic is provided, check for existing conversation with same topic
      // If no topic, only match conversations without a topic
      if (dto.topic) {
        whereClause.topic = dto.topic;
      } else {
        whereClause.topic = null;
      }
      
      // Check if tenant already has a PENDING or OPEN conversation with this topic
      const existingConversation = await this.prisma.conversation.findFirst({
        where: whereClause,
        include: {
          tenant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (existingConversation) {
        console.log(`[ChatService] Reusing existing conversation: ${existingConversation.id}`);
        
        // If initial message provided, add it to existing conversation
        if (dto.content) {
          await this.prisma.message.create({
            data: {
              conversationId: existingConversation.id,
              senderRole: SenderRole.TENANT, // Use SenderRole enum
              senderId: tenantId,
              content: dto.content,
              status: 'SENT',
            },
          });
          
          // Update conversation timestamp
          await this.prisma.conversation.update({
            where: { id: existingConversation.id },
            data: { updatedAt: new Date() },
          });
        }
        
        return existingConversation;
      }

      // Create new conversation with PENDING status and topic
      const conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          topic: dto.topic || null, // Include topic if provided
          status: 'PENDING', // Starts as PENDING until admin views it
        },
        include: {
          tenant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      console.log(`[ChatService] New conversation created: ${conversation.id}`);

      // If initial message provided, create it
      if (dto.content) {
        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderRole: SenderRole.TENANT, // Use SenderRole enum
            senderId: tenantId,
            content: dto.content,
            status: 'SENT',
          },
        });
      }

      return conversation;
    } catch (error) {
      console.error('[ChatService] Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for current user (tenant or admin)
   * Now properly resolves User → Tenant for role-based filtering
   * Supports status filtering
   */
  async findAllConversationsForUser(user: any, statusFilter?: string) {
    try {
      const role = user.role; // Use AdminRole directly
      console.log(`[ChatService] Finding conversations - User: ${user.email}, Role: ${role}, Status: ${statusFilter || 'all'}`);
      
      const where: any = {};

      // Apply status filter if provided
      if (statusFilter) {
        where.status = statusFilter.toUpperCase();
      }

      if (role === AdminRole.TENANT_USER) {
        // Resolve tenant from user
        const tenant = await this.resolveTenantForUser(user);
        where.tenantId = tenant.id;
        console.log(`[ChatService] Filtering by tenantId: ${tenant.id}`);
      } else if (role === AdminRole.ADMIN || role === AdminRole.SUPER_ADMIN || role === AdminRole.SUPPORT) {
        // Admins and Support see all conversations (or filtered by status)
        console.log(`[ChatService] Admin/Support viewing conversations`);
      } else {
        throw new ForbiddenException('ROLE_NOT_ALLOWED');
      }

      const conversations = await this.prisma.conversation.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          admin: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      
      console.log(`[ChatService] Found ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('[ChatService] Error finding conversations:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID with access control
   * Now properly validates tenant ownership
   */
  async findConversationByIdForUser(conversationId: string, user: any) {
    const role = user.role; // Use AdminRole directly
    
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        tenant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException({
        code: 'CONVERSATION_NOT_FOUND',
        message: 'Conversation not found',
      });
    }

    // Access control for tenants
    if (role === AdminRole.TENANT_USER) {
      const tenant = await this.resolveTenantForUser(user);
      if (conversation.tenantId !== tenant.id) {
        throw new ForbiddenException({
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this conversation',
        });
      }
    }
    // Admins can view any conversation (PermissionsGuard handles this for API)

    return conversation;
  }

  /**
   * Get messages for a conversation (with access control)
   * Auto-transitions PENDING → OPEN when admin views
   */
  async findMessagesByConversationIdForUser(conversationId: string, user: any) {
    const role = user.role; // Use AdminRole directly
    
    // First check access (throws if user doesn't have permission)
    const conversation = await this.findConversationByIdForUser(conversationId, user);

    // Auto-transition to OPEN when admin first views
    if ((role === AdminRole.ADMIN || role === AdminRole.SUPER_ADMIN || role === AdminRole.SUPPORT) && conversation.status === 'PENDING') {
      console.log(`[ChatService] Admin viewing PENDING conversation ${conversationId} - transitioning to OPEN`);
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { 
          status: 'OPEN',
          adminId: user.id, // Assign admin who opened it (using user.id from JwtStrategy payload)
        },
      });
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Send a message (called from WebSocket)
   */
  async sendMessage(dto: SendMessageDto) {
    // Verify conversation exists
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Use SenderRole enum directly from dto
    const senderRole = dto.senderRole;

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderRole: senderRole as SenderRole, // Cast to SenderRole enum
        senderId: dto.senderId,
        content: dto.content,
        fileUrl: dto.fileUrl,
        status: 'SENT',
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Mark messages as read (with proper access control)
   */
  async markMessagesAsReadForUser(conversationId: string, user: any) {
    const role = user.role; // Use AdminRole directly
    
    // Verify access (throws if user doesn't have permission)
    await this.findConversationByIdForUser(conversationId, user);

    // Mark all messages as READ that were sent by the OTHER party
    const senderRoleToMark = role === AdminRole.TENANT_USER ? SenderRole.ADMIN : SenderRole.TENANT;

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderRole: senderRoleToMark,
        status: { in: ['SENT', 'DELIVERED'] },
      },
      data: {
        status: 'READ',
      },
    });

    return { success: true };
  }

  /**
   * Assign admin to conversation
   */
  async assignAdmin(conversationId: string, adminId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { adminId },
    });
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Check if user has access to conversation
   */
  async canUserAccessConversation(conversationId: string, user: any): Promise<boolean> {
    const role = user.role; // Use AdminRole directly
    
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { tenantId: true, adminId: true },
    });

    if (!conversation) return false;

    // Admins and Support can access all conversations
    if (role === AdminRole.ADMIN || role === AdminRole.SUPER_ADMIN || role === AdminRole.SUPPORT) return true;

    // Tenant users can only access their own conversations
    if (role === AdminRole.TENANT_USER) {
      try {
        const tenant = await this.resolveTenantForUser(user);
        return conversation.tenantId === tenant.id;
      } catch {
        return false;
      }
    }

    return false;
  }
}

