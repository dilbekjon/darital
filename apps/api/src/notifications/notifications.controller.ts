import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { PrismaService } from '../prisma.service';
import { NotificationsService } from './notifications.service';
import { MinioService } from '../minio/minio.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly minio: MinioService,
  ) {}

  @Post('test')
  @Permissions('notifications.manage') // New permissions decorator
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Trigger a test notification (Email + Telegram) for a tenant (admin only)' })
  async sendTest(
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    // Validate and extract fields from multipart form data
    const { tenantId, template } = body;
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'tenantId is required', details: null });
    }
    if (!template || (template !== 'reminder' && template !== 'overdue')) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'template must be "reminder" or "overdue"', details: null });
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Tenant not found', details: null });
    }
    if (!tenant.email) {
      throw new BadRequestException({ code: 'NO_EMAIL', message: 'Tenant has no email', details: null });
    }

    // Try to derive some context from latest contract
    const contract = await this.prisma.contract.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      include: { unit: true },
    });

    const amount = contract ? contract.amount.toNumber() : 100.0;
    const unitName = contract?.unit?.name || 'Unit';

    // Upload image if provided
    let imageUrl: string | undefined;
    if (image) {
      try {
        imageUrl = await this.minio.uploadFile(image, 'notifications');
      } catch (error: any) {
        throw new BadRequestException({ code: 'UPLOAD_ERROR', message: `Failed to upload image: ${error?.message || 'Unknown error'}` });
      }
    }

    if (template === 'reminder') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      await this.notifications.sendPaymentReminder(tenant.id, tenant.email, dueDate, amount, unitName, imageUrl);
      return { ok: true, message: 'Payment reminder sent via Email and Telegram' };
    }

    if (template === 'overdue') {
      await this.notifications.sendOverdueNotice(tenant.id, tenant.email, amount, 5, imageUrl);
      return { ok: true, message: 'Overdue notice sent via Email and Telegram' };
    }

    throw new BadRequestException({ code: 'INVALID_TEMPLATE', message: 'Unknown template', details: null });
  }

  @Post('telegram/test')
  @Permissions('notifications.manage') // New permissions decorator
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Send a manual Telegram message to a tenant (admin only)' })
  async sendTelegramTest(
    @Body() body: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    // Log received data for debugging
    console.log('📥 Received Telegram test request:', {
      bodyKeys: Object.keys(body),
      tenantId: body.tenantId,
      message: body.message,
      hasImage: !!image,
    });
    
    // Validate and extract fields from multipart form data
    const { tenantId, message } = body;
    if (!tenantId || typeof tenantId !== 'string') {
      console.error('❌ Validation failed: tenantId missing or invalid', { tenantId, type: typeof tenantId });
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'tenantId is required', details: null });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.error('❌ Validation failed: message missing or invalid', { message, type: typeof message });
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'message is required', details: null });
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException({ code: 'NOT_FOUND', message: 'Tenant not found', details: null });
    }

    // Check if tenant has Telegram linked
    const telegramUser = await this.prisma.telegramUser.findFirst({
      where: { tenantId },
    });

    if (!telegramUser) {
      console.log(`❌ Tenant ${tenantId} (${tenant.fullName}) has no Telegram account linked`);
      throw new BadRequestException({ 
        code: 'NO_TELEGRAM', 
        message: `Tenant ${tenant.fullName} has no Telegram account linked. They need to send /start to @darital_arenda_bot on Telegram first.`, 
        details: { tenantId, tenantName: tenant.fullName } 
      });
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (image) {
      try {
        imageUrl = await this.minio.uploadFile(image, 'notifications');
      } catch (error: any) {
        throw new BadRequestException({ code: 'UPLOAD_ERROR', message: `Failed to upload image: ${error?.message || 'Unknown error'}` });
      }
    }

    // Send the message with optional image
    await this.notifications.sendTelegramMessage(telegramUser.chatId, message, imageUrl);

    return { 
      ok: true, 
      message: 'Telegram message sent successfully',
      details: {
        tenantId,
        tenantName: tenant.fullName,
        chatId: telegramUser.chatId,
      }
    };
  }
}


