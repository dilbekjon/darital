import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinConversationDto } from './dto/join-conversation.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Allow local network IPs for mobile
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // Allow 10.x.x.x IPs
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  /**
   * Handle new WebSocket connection with JWT validation
   */
  async handleConnection(client: Socket) {
    try {
      console.log(`🔌 Client attempting to connect: ${client.id}`);

      // Extract JWT token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token as string;

      if (!token) {
        console.log(`❌ No token provided by client ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token);
      
      // Attach user info to socket
      client.data.userId = payload.sub || payload.id;
      client.data.email = payload.email;
      client.data.role = payload.role;

      // Add admin users to 'admin' room for global notifications
      const role = String(payload.role).toUpperCase();
      if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT' || role === 'USER_MANAGER') {
        client.join('admin');
        console.log(`✅ Admin client ${client.id} joined 'admin' room`);
      } else if (role === 'TENANT_USER' || role === 'TENANT') {
        // Tenants join their tenant-specific room for conversation list updates
        // We need to resolve tenantId from email
        try {
          const tenant = await this.chatService.resolveTenantForUser({
            email: payload.email,
            sub: payload.sub || payload.id,
            role: payload.role,
          });
          const tenantRoom = `tenant:${tenant.id}:conversations`;
          client.join(tenantRoom);
          console.log(`✅ Tenant client ${client.id} joined '${tenantRoom}' room`);
        } catch (error) {
          console.warn(`⚠️ Could not resolve tenant for ${payload.email}, skipping tenant room join`);
        }
      }

      console.log(`✅ Client connected: ${client.id} (${payload.email}, ${payload.role})`);
      
      // Send connection success
      client.emit('connected', {
        message: 'Connected to chat server',
        userId: client.data.userId,
        role: client.data.role,
      });
    } catch (error) {
      console.error(`❌ Authentication failed for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id} (${client.data.email || 'unknown'})`);
  }

  /**
   * Helper: Get standardized room name for a conversation
   */
  private getRoomName(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    try {
      console.log(`📥 join_conversation: ${dto.conversationId} by ${client.data.email}`);

      // Check if user has access to this conversation
      const user = {
        sub: client.data.userId,
        email: client.data.email,
        role: client.data.role,
      };
      const hasAccess = await this.chatService.canUserAccessConversation(
        dto.conversationId,
        user,
      );

      if (!hasAccess) {
        client.emit('error', {
          message: 'Access denied to this conversation',
          event: 'join_conversation',
        });
        return;
      }

      // Join the standardized conversation room
      const room = this.getRoomName(dto.conversationId);
      await client.join(room);
      
      // Get room size for debugging
      const roomSockets = await this.server.in(room).fetchSockets();
      console.log(`✅ ${client.data.email} (${client.data.role}) joined room ${room} (total clients in room: ${roomSockets.length}, socketId: ${client.id})`);
      
      // Notify user
      client.emit('joined_conversation', {
        conversationId: dto.conversationId,
        message: 'Successfully joined conversation',
      });

      // Notify other participants in the room
      client.to(room).emit('user_joined', {
        userId: client.data.userId,
        role: client.data.role,
      });
    } catch (error) {
      console.error('Error joining conversation:', error);
      client.emit('error', {
        message: 'Failed to join conversation',
        event: 'join_conversation',
      });
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinConversationDto,
  ) {
    try {
      const room = this.getRoomName(dto.conversationId);
      await client.leave(room);
      console.log(`✅ ${client.data.email} left room ${room}`);
      
      client.emit('left_conversation', {
        conversationId: dto.conversationId,
        message: 'Successfully left conversation',
      });
    } catch (error) {
      console.error('Error leaving conversation:', error);
      client.emit('error', {
        message: 'Failed to leave conversation',
        event: 'leave_conversation',
      });
    }
  }

  /**
   * Send a message
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    try {
      console.log(`📤 send_message in ${dto.conversationId} by ${client.data.email}`);

      // Verify access
      const user = {
        sub: client.data.userId,
        email: client.data.email,
        role: client.data.role,
      };
      const hasAccess = await this.chatService.canUserAccessConversation(
        dto.conversationId,
        user,
      );

      if (!hasAccess) {
        client.emit('error', {
          message: 'Access denied to this conversation',
          event: 'send_message',
        });
        return;
      }

      // Check if conversation is closed - tenants cannot send messages to closed conversations
      const conversation = await this.chatService.findConversationByIdForUser(
        dto.conversationId,
        user,
      );

      if (conversation.status === 'CLOSED') {
        const userRole = String(client.data.role).toUpperCase();
        const isTenant = userRole === 'TENANT_USER' || userRole === 'TENANT';
        
        if (isTenant) {
          throw new WsException({
            code: 'CONVERSATION_CLOSED',
            message: 'This conversation is closed. You cannot send messages to closed conversations.',
          });
        }
        // Admins can still send messages to closed conversations (to reopen if needed)
      }

      // Verify sender matches authenticated user
      if (dto.senderId !== client.data.userId) {
        client.emit('error', {
          message: 'Sender ID does not match authenticated user',
          event: 'send_message',
        });
        return;
      }

      // Verify role matches (case-insensitive to prevent frontend/backend mismatch)
      const clientRole = String(dto.senderRole).toUpperCase();
      const authRole = String(client.data.role).toUpperCase();
      
      // Map roles for chat purposes:
      // - SUPER_ADMIN, USER_MANAGER -> ADMIN (can reply as admin)
      // - TENANT_USER -> TENANT
      // - Other roles stay as-is
      let normalizedAuthRole = authRole;
      if (authRole === 'SUPER_ADMIN' || authRole === 'USER_MANAGER') {
        normalizedAuthRole = 'ADMIN';
      } else if (authRole === 'TENANT_USER') {
        normalizedAuthRole = 'TENANT';
      }
      
      console.log(`[ChatGateway] Message sender verification - Auth: ${normalizedAuthRole}, Claimed: ${clientRole}`);
      
      if (clientRole !== normalizedAuthRole) {
        console.error(`[ChatGateway] Role mismatch! User role: ${normalizedAuthRole}, Claimed role: ${clientRole}`);
        client.emit('error', {
          message: `Sender role mismatch. You are ${normalizedAuthRole}, cannot send as ${clientRole}`,
          event: 'send_message',
        });
        return;
      }
      
      console.log(`[ChatGateway] ✅ Message sender verified: ${normalizedAuthRole} → ${clientRole}`);

      // Save message to database
      const message = await this.chatService.sendMessage(dto);

      // Get standardized room name
      const room = this.getRoomName(dto.conversationId);

      // Broadcast to all clients in the conversation room (including sender)
      // Emit both message_created (new) and message_received (backward compat)
      const messagePayload = {
        ...message,
        senderEmail: client.data.email,
      };
      
      // Get room size for debugging
      const roomSockets = await this.server.in(room).fetchSockets();
      console.log(`📤 Broadcasting message_created to room ${room} (${roomSockets.length} clients)`);
      
      this.server.to(room).emit('message_created', messagePayload);
      this.server.to(room).emit('message_received', messagePayload); // Backward compat

      // If message is from tenant, notify all admins about unread count update
      if (dto.senderRole === 'TENANT' || dto.senderRole === 'SenderRole.TENANT') {
        // Emit to all admin clients (they should be in 'admin' room)
        this.server.to('admin').emit('unread_count_updated');
        // Also emit globally as fallback
        this.server.emit('unread_count_updated');
      }

      console.log(`✅ Message sent in ${dto.conversationId}: ${message.id}, emitted to ${roomSockets.length} clients in room ${room}`);
    } catch (error) {
      console.error('Error sending message:', error);
      client.emit('error', {
        message: 'Failed to send message',
        event: 'send_message',
        details: error.message,
      });
    }
  }

  /**
   * Mark messages as read
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkReadDto,
  ) {
    try {
      console.log(`👁️ mark_read: ${dto.conversationId} by ${client.data.email}`);

      const user = {
        sub: client.data.userId,
        email: client.data.email,
        role: client.data.role,
      };

      // Mark messages as read (includes access control)
      await this.chatService.markMessagesAsReadForUser(
        dto.conversationId,
        user,
      );

      // Notify other participants in the room
      const room = this.getRoomName(dto.conversationId);
      client.to(room).emit('messages_read', {
        conversationId: dto.conversationId,
        readBy: client.data.userId,
        readByRole: client.data.role,
      });

      // If admin marked messages as read, notify all admins about unread count update
      const role = String(client.data.role).toUpperCase();
      if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT' || role === 'USER_MANAGER') {
        this.server.to('admin').emit('unread_count_updated');
        this.server.emit('unread_count_updated');
      }

      console.log(`✅ Messages marked as read in ${dto.conversationId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      client.emit('error', {
        message: 'Failed to mark messages as read',
        event: 'mark_read',
      });
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    // Broadcast to others in the room (not sender)
    const room = this.getRoomName(data.conversationId);
    client.to(room).emit('user_typing', {
      userId: client.data.userId,
      email: client.data.email,
      role: client.data.role,
      conversationId: data.conversationId,
    });
  }

  /**
   * Stop typing indicator
   */
  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    // Broadcast to others in the room (not sender)
    const room = this.getRoomName(data.conversationId);
    client.to(room).emit('user_stop_typing', {
      userId: client.data.userId,
      email: client.data.email,
      role: client.data.role,
      conversationId: data.conversationId,
    });
  }

  /**
   * Emit message to room (called from ChatService when message is created via REST)
   * This ensures messages created via HTTP also trigger real-time updates
   */
  async emitMessageCreated(conversationId: string, message: any, senderEmail?: string) {
    const room = this.getRoomName(conversationId);
    const messagePayload = {
      ...message,
      senderEmail,
    };
    
    // Get room size for debugging
    const roomSockets = await this.server.in(room).fetchSockets();
    console.log(`📤 [emitMessageCreated] Broadcasting message_created to room ${room} (${roomSockets.length} clients): ${message.id}`);
    
    this.server.to(room).emit('message_created', messagePayload);
    this.server.to(room).emit('message_received', messagePayload); // Backward compat
    
    // If message is from tenant, notify all admins about unread count update
    if (message.senderRole === 'TENANT' || message.senderRole === 'SenderRole.TENANT') {
      this.server.to('admin').emit('unread_count_updated');
      this.server.emit('unread_count_updated');
    }
    
    console.log(`✅ [emitMessageCreated] Emitted message_created to room ${room} (${roomSockets.length} clients): ${message.id}`);
  }

  /**
   * Emit conversation updated event (called from ChatService when conversation state changes)
   * Broadcasts to conversation room, admin room, and tenant-specific room
   */
  async emitConversationUpdated(conversation: any) {
    const conversationRoom = this.getRoomName(conversation.id);
    const tenantRoom = `tenant:${conversation.tenantId}:conversations`;
    
    const payload = {
      conversation,
      updatedAt: new Date().toISOString(),
    };
    
    // Get room sizes for debugging
    const [convSockets, adminSockets, tenantSockets] = await Promise.all([
      this.server.in(conversationRoom).fetchSockets(),
      this.server.in('admin').fetchSockets(),
      this.server.in(tenantRoom).fetchSockets(),
    ]);
    
    // Emit to conversation room (all participants)
    this.server.to(conversationRoom).emit('conversation_updated', payload);
    
    // Emit to admin room (for admin list updates)
    this.server.to('admin').emit('conversation_updated', payload);
    
    // Emit to tenant-specific room (for tenant list updates)
    this.server.to(tenantRoom).emit('conversation_updated', payload);
    
    // Also emit globally as fallback
    this.server.emit('conversation_updated', payload);
    
    console.log(`📤 Emitted conversation_updated for ${conversation.id} to rooms: ${conversationRoom} (${convSockets.length} clients), admin (${adminSockets.length} clients), ${tenantRoom} (${tenantSockets.length} clients)`);
  }

  /**
   * Emit payment updated event (called from PaymentsService when payment status changes)
   * Broadcasts to admin room and tenant-specific room
   */
  async emitPaymentUpdated(payment: any) {
    const payload = {
      payment,
      updatedAt: new Date().toISOString(),
    };
    
    // Get room sizes for debugging
    const [adminSockets, tenantSockets] = await Promise.all([
      this.server.in('admin').fetchSockets(),
      payment.invoice?.contract?.tenantId 
        ? this.server.in(`tenant:${payment.invoice.contract.tenantId}:payments`).fetchSockets()
        : Promise.resolve([]),
    ]);
    
    // Emit to admin room (for admin payment list updates)
    this.server.to('admin').emit('payment_updated', payload);
    
    // Emit to tenant-specific room (for tenant payment list updates)
    if (payment.invoice?.contract?.tenantId) {
      const tenantRoom = `tenant:${payment.invoice.contract.tenantId}:payments`;
      this.server.to(tenantRoom).emit('payment_updated', payload);
    }
    
    // Also emit globally as fallback
    this.server.emit('payment_updated', payload);
    
    console.log(`📤 Emitted payment_updated for ${payment.id} (status: ${payment.status}) to admin room (${adminSockets.length} clients)`);
  }

  /**
   * Helper: Get tenant room name for conversation list updates
   */
  private getTenantRoomName(tenantId: string): string {
    return `tenant:${tenantId}:conversations`;
  }
}

