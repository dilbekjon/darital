import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated path
import { Permissions } from '../rbac/permissions.decorator'; // New import
// import { AdminRole } from '@prisma/client'; // Removed unused import
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UploadFileResponseDto } from './dto/upload-file.dto';
import { ChatFileUploadInterceptor } from './chat-file-upload.interceptor';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  // For tenants, access is granted if authenticated. Admins need chat.read to create on behalf of a tenant.
  @Permissions('chat.read') // Admin can create conversation (implicitly has reply rights)
  @ApiOperation({
    summary: 'Create a new conversation',
    description: 'Tenant starts a new chat conversation. Optionally includes initial message.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    schema: {
      example: {
        id: 'clx123456',
        tenantId: 'clx789012',
        adminId: null,
        status: 'OPEN',
        createdAt: '2025-10-25T10:00:00Z',
        updatedAt: '2025-10-25T10:00:00Z',
        tenant: {
          id: 'clx789012',
          fullName: 'John Doe',
          email: 'john@example.com',
        },
      },
    },
  })
  async createConversation(@Req() req, @Body() dto: CreateConversationDto) {
    try {
      console.log(`[ChatController] Creating conversation - User: ${req.user.email}, Role: ${req.user.role}`);
      
      // chatService needs to handle role-based logic for creating conversations
      const conversation = await this.chatService.createConversationForUser(req.user, dto);
      console.log(`[ChatController] Conversation created successfully: ${conversation.id}`);
      return conversation;
    } catch (error) {
      console.error('[ChatController] Error creating conversation:', error);
      throw error;
    }
  }

  @Get()
  @Permissions('chat.read') // Both tenants (their own) and admins (all) need chat.read
  @ApiOperation({
    summary: 'Get all conversations',
    description:
      'Returns all conversations for current user. Tenants see their own, admins see all. Supports status filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    schema: {
      example: [
        {
          id: 'clx123456',
          tenantId: 'clx789012',
          adminId: 'clx345678',
          status: 'OPEN',
          createdAt: '2025-10-25T10:00:00Z',
          updatedAt: '2025-10-25T10:00:00Z',
          tenant: {
            id: 'clx789012',
            fullName: 'John Doe',
            email: 'john@example.com',
          },
          admin: {
            id: 'clx345678',
            fullName: 'Admin User',
            email: 'admin@darital.local',
          },
          messages: [
            {
              id: 'clx901234',
              content: 'Latest message',
              createdAt: '2025-10-25T10:05:00Z',
              status: 'READ',
            },
          ],
        },
      ],
    },
  })
  async findAll(@Req() req, @Query('status') status?: string) {
    try {
      console.log(`[ChatController] Fetching conversations - User: ${req.user.email}, Role: ${req.user.role}, Status filter: ${status || 'none'}`);
      
      const conversations = await this.chatService.findAllConversationsForUser(req.user, status);
      console.log(`[ChatController] Found ${conversations.length} conversations`);
      return conversations;
    } catch (error) {
      console.error('[ChatController] Error fetching conversations:', error);
      throw error;
    }
  }

  @Get(':id')
  @Permissions('chat.read') // Both tenants (their own) and admins (all) need chat.read
  @ApiOperation({
    summary: 'Get conversation by ID',
    description: 'Returns conversation details with access control',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this conversation',
  })
  @ApiResponse({
    status: 404,
    description: 'Conversation not found',
  })
  async findOne(@Param('id') id: string, @Req() req) {
    try {
      return this.chatService.findConversationByIdForUser(id, req.user);
    } catch (error) {
      console.error('[ChatController] Error fetching conversation:', error);
      throw error;
    }
  }

  @Get(':id/messages')
  @Permissions('chat.read') // Both tenants (their own) and admins (all) need chat.read
  @ApiOperation({
    summary: 'Get conversation messages',
    description: 'Returns all messages for a conversation (with access control)',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    schema: {
      example: [
        {
          id: 'clx901234',
          conversationId: 'clx123456',
          senderRole: 'TENANT',
          senderId: 'clx789012',
          content: 'Hello, I need help with my invoice',
          fileUrl: null,
          status: 'READ',
          createdAt: '2025-10-25T10:00:00Z',
        },
        {
          id: 'clx901235',
          conversationId: 'clx123456',
          senderRole: 'ADMIN',
          senderId: 'clx345678',
          content: 'Hello! How can I help you?',
          fileUrl: null,
          status: 'DELIVERED',
          createdAt: '2025-10-25T10:01:00Z',
        },
      ],
    },
  })
  async getMessages(@Param('id') id: string, @Req() req) {
    try {
      return this.chatService.findMessagesByConversationIdForUser(id, req.user);
    } catch (error) {
      console.error('[ChatController] Error fetching messages:', error);
      throw error;
    }
  }

  @Patch(':id/assign')
  @Permissions('chat.reply') // Assigning is part of managing/replying to chats
  @ApiOperation({
    summary: 'Assign admin to conversation',
    description: 'Admin takes ownership of a conversation (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin assigned successfully',
  })
  async assignAdmin(@Param('id') id: string, @Req() req) {
    return this.chatService.assignAdmin(id, req.user.sub);
  }

  @Patch(':id/close')
  @Permissions('chat.reply') // Closing is part of managing/replying to chats
  @ApiOperation({
    summary: 'Close conversation',
    description: 'Mark conversation as closed (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation ID',
    example: 'clx123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation closed successfully',
  })
  async closeConversation(@Param('id') id: string, @Req() req) {
    try {
      console.log(`[ChatController] Closing conversation ${id} by ${req.user.email}`);
      return this.chatService.closeConversation(id);
    } catch (error) {
      console.error('[ChatController] Error closing conversation:', error);
      throw error;
    }
  }

  @Post('upload')
  @Permissions('chat.reply') // Uploading files is part of replying in chats
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    ChatFileUploadInterceptor,
  )
  @ApiOperation({
    summary: 'Upload file for chat',
    description: 'Upload a file (image, PDF, document) to be sent in chat. Returns fileUrl to use in send_message.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: UploadFileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file (size/type)',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<UploadFileResponseDto> {
    return {
      fileUrl: `/uploads/chat/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}

