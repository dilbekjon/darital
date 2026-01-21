import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException, NotFoundException, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { TelegramService } from './telegram.service';
import { SendTelegramMessageDto } from './dto/send-message.dto';
import { PrismaService } from '../prisma.service';

@ApiTags('telegram')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('users')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Get all Telegram users with linked tenants' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (TENANT, ADMIN, SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'List of Telegram users' })
  async getTelegramUsers(@Query('role') role?: string) {
    const where: any = {};
    if (role) {
      where.role = role;
    }

    const telegramUsers = await this.prisma.telegramUser.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get tenant info for users that have tenantId
    const tenantIds = telegramUsers.filter(tu => tu.tenantId).map(tu => tu.tenantId!);
    const tenants = tenantIds.length > 0 ? await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, fullName: true, email: true },
    }) : [];

    const tenantMap = new Map(tenants.map(t => [t.id, t]));

    return {
      ok: true,
      users: telegramUsers.map((tu) => ({
        chatId: tu.chatId,
        tenantId: tu.tenantId,
        role: tu.role,
        tenant: tu.tenantId ? (tenantMap.get(tu.tenantId) || null) : null,
        createdAt: tu.createdAt.toISOString(),
      })),
      total: telegramUsers.length,
    };
  }

  @Get('users/:chatId')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Get Telegram user by chatId' })
  @ApiResponse({ status: 200, description: 'Telegram user details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getTelegramUser(@Param('chatId') chatId: string) {
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { chatId },
    });

    if (!telegramUser) {
      throw new NotFoundException(`Telegram user with chatId ${chatId} not found`);
    }

    // Get tenant info if tenantId exists
    const tenant = telegramUser.tenantId ? await this.prisma.tenant.findUnique({
      where: { id: telegramUser.tenantId },
      select: { id: true, fullName: true, email: true },
    }) : null;

    return {
      ok: true,
      user: {
        chatId: telegramUser.chatId,
        tenantId: telegramUser.tenantId,
        role: telegramUser.role,
        tenant: tenant,
        createdAt: telegramUser.createdAt.toISOString(),
      },
    };
  }

  @Post('send-message')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Send a message to a Telegram user (by tenantId or chatId)' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or user not found' })
  async sendMessage(@Body() dto: SendTelegramMessageDto) {
    let chatId: string;

    // If chatId is provided, use it directly
    if (dto.chatId) {
      chatId = dto.chatId;
    } else if (dto.tenantId) {
      // If tenantId is provided, find the chatId
      const telegramUser = await this.prisma.telegramUser.findFirst({
        where: { tenantId: dto.tenantId },
      });

      if (!telegramUser) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: dto.tenantId },
          select: { fullName: true },
        });

        throw new BadRequestException({
          code: 'NO_TELEGRAM',
          message: `Tenant ${tenant?.fullName || dto.tenantId} has no Telegram account linked. They need to send /start to the bot on Telegram first.`,
          details: { tenantId: dto.tenantId, tenantName: tenant?.fullName },
        });
      }

      chatId = telegramUser.chatId;
    } else {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'Either tenantId or chatId is required',
      });
    }

    // Send the message
    await this.telegramService.sendMessage(chatId, dto.message, dto.imageUrl);

    // Get tenant info for response
    const telegramUser = await this.prisma.telegramUser.findUnique({
      where: { chatId },
    });

    const tenant = telegramUser?.tenantId ? await this.prisma.tenant.findUnique({
      where: { id: telegramUser.tenantId },
      select: { id: true, fullName: true, email: true },
    }) : null;

    return {
      ok: true,
      message: 'Message sent successfully',
      details: {
        chatId,
        tenantId: telegramUser?.tenantId,
        tenantName: tenant?.fullName,
        message: dto.message,
        sentAt: new Date().toISOString(),
      },
    };
  }

  @Post('send-broadcast')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Send a message to all Telegram users (broadcast)' })
  @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
  async sendBroadcast(@Body() dto: { message: string; role?: string }) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        message: 'Message is required',
      });
    }

    const where: any = {};
    if (dto.role) {
      where.role = dto.role;
    }

    const telegramUsers = await this.prisma.telegramUser.findMany({
      where,
    });

    const results = [];
    const errors = [];

    for (const user of telegramUsers) {
      try {
        await this.telegramService.sendMessage(user.chatId, dto.message);
        results.push({ chatId: user.chatId, success: true });
      } catch (error: any) {
        errors.push({ chatId: user.chatId, error: error.message });
      }
    }

    return {
      ok: true,
      message: 'Broadcast completed',
      sent: results.length,
      failed: errors.length,
      total: telegramUsers.length,
      details: {
        successful: results,
        failed: errors,
      },
    };
  }

  @Get('bot-info')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Get Telegram bot information' })
  @ApiResponse({ status: 200, description: 'Bot information' })
  async getBotInfo() {
    const enabled = process.env.TELEGRAM_ENABLE === 'true';
    const token = process.env.TELEGRAM_BOT_TOKEN || '';

    if (!enabled || !token) {
      return {
        ok: false,
        enabled: false,
        message: 'Telegram bot is disabled',
      };
    }

    try {
      const botInfo = await this.telegramService.getBotInfo();
      return {
        ok: true,
        enabled: true,
        bot: {
          username: botInfo.username,
          firstName: botInfo.first_name,
          id: botInfo.id,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        enabled: true,
        error: error.message || 'Failed to get bot info',
      };
    }
  }
}
