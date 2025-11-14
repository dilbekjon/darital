import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinConversationDto } from './dto/join-conversation.dto';
import { MarkReadDto } from './dto/mark-read.dto';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
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

      // Join the conversation room
      await client.join(dto.conversationId);
      
      console.log(`✅ ${client.data.email} joined room ${dto.conversationId}`);
      
      // Notify user
      client.emit('joined_conversation', {
        conversationId: dto.conversationId,
        message: 'Successfully joined conversation',
      });

      // Notify other participants in the room
      client.to(dto.conversationId).emit('user_joined', {
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
      
      // Map SUPER_ADMIN to ADMIN for chat purposes
      const normalizedAuthRole = authRole === 'SUPER_ADMIN' ? 'ADMIN' : authRole;
      
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

      // Broadcast to all clients in the conversation room (including sender)
      this.server.to(dto.conversationId).emit('message_received', {
        ...message,
        senderEmail: client.data.email,
      });

      console.log(`✅ Message sent in ${dto.conversationId}: ${message.id}`);
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

      // Notify other participants
      client.to(dto.conversationId).emit('messages_read', {
        conversationId: dto.conversationId,
        readBy: client.data.userId,
        readByRole: client.data.role,
      });

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
    client.to(data.conversationId).emit('user_typing', {
      userId: client.data.userId,
      email: client.data.email,
      role: client.data.role,
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
    client.to(data.conversationId).emit('user_stop_typing', {
      userId: client.data.userId,
      email: client.data.email,
      role: client.data.role,
    });
  }
}

