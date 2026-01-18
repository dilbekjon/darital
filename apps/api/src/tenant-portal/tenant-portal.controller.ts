import { Controller, Get, Post, Patch, Body, Req, Param, UseGuards, Logger, NotFoundException, UsePipes, ValidationPipe, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Corrected import path
import { TenantPortalService } from './tenant-portal.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { AdminRole } from '@prisma/client'; // Import AdminRole
import { PaymentIntentDto } from '../payments/dto/payment-intent.dto';

@ApiTags('Tenant Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@Throttle({ default: { ttl: 60000, limit: 60 } }) // 60 requests per minute for all tenant routes
@Controller('tenant')
export class TenantPortalController {
  private readonly logger = new Logger(TenantPortalController.name);

  constructor(private readonly tenantPortalService: TenantPortalService) {}

  // Helper to ensure only TENANT_USER can access their own data
  private ensureTenantAccess(user: any) {
    if (user.role !== AdminRole.TENANT_USER) {
      throw new ForbiddenException('Access denied: Only tenant users can access their portal data.');
    }
  }

  @Get('me')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ summary: 'Get current authenticated tenant' })
  async getTenantProfile(@Req() req) {
    this.ensureTenantAccess(req.user);
    this.logger.log(`Request received for /me by user: ${req.user?.email}`);
    const data = await this.tenantPortalService.getProfileForUser(req.user);
    if (!data) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Tenant profile not found',
      });
    }
    return data;
  }

  @Get('invoices')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ summary: 'Get tenant invoices' })
  async getTenantInvoices(@Req() req) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getInvoicesForUser(req.user);
  }

  @Get('payments')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ summary: 'Get tenant payments' })
  async getTenantPayments(@Req() req) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getPaymentsForUser(req.user);
  }

  @Post('payments/intent')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create payment intent for an invoice' })
  async createPaymentIntent(@Req() req, @Body() dto: PaymentIntentDto) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.createPaymentIntent(req.user, dto);
  }

  @Get('payments/:id')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ 
    summary: 'Get payment details',
    description: 'Returns detailed information about a specific payment including invoice info'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payment details retrieved successfully',
    schema: {
      example: {
        id: 'clx123456',
        amount: 1200000,
        method: 'ONLINE',
        status: 'CONFIRMED',
        createdAt: '2025-01-15T10:30:00Z',
        paidAt: '2025-01-15T10:35:00Z',
        invoice: {
          id: 'clx789012',
          amount: 1200000,
          dueDate: '2025-01-20T00:00:00Z',
          status: 'PAID'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentDetail(@Req() req, @Param('id') id: string) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getPaymentDetail(req.user, id);
  }

  @Post('payments/:id/refresh')
  @ApiOperation({ summary: 'Refresh payment status from provider' })
  async refreshPaymentStatus(@Req() req, @Param('id') id: string) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.refreshPaymentStatus(req.user, id);
  }

  @Get('balance')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ summary: 'Get tenant balance' })
  async getTenantBalance(@Req() req) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getBalanceForUser(req.user);
  }

  @Post('devices/register')
  // Permissions are handled by ensureTenantAccess helper
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Register device for push notifications',
    description: 'Tenant can register their mobile device FCM token to receive push notifications for payment reminders'
  })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async registerDevice(@Req() req, @Body() dto: RegisterDeviceDto) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.registerDevice(req.user, dto);
  }

  @Get('devices')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ 
    summary: 'Get registered devices',
    description: 'Returns all registered FCM tokens for this tenant (for debugging purposes)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of registered devices',
    schema: {
      example: {
        devices: [
          {
            id: 'clx123456',
            fcmToken: 'dTQ8xY...',
            platform: 'android',
            createdAt: '2025-01-15T10:30:00Z'
          }
        ]
      }
    }
  })
  async getDevices(@Req() req) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getDevices(req.user);
  }

  @Get('notifications/preferences')
  // Permissions are handled by ensureTenantAccess helper
  @ApiOperation({ 
    summary: 'Get notification preferences',
    description: 'Returns current notification channel preferences for the tenant'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification preferences retrieved successfully',
    schema: {
      example: {
        preferences: [
          { channel: 'EMAIL', enabled: true },
          { channel: 'TELEGRAM', enabled: false },
          { channel: 'PUSH', enabled: true },
          { channel: 'SMS', enabled: true }
        ]
      }
    }
  })
  async getNotificationPreferences(@Req() req) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.getNotificationPreferences(req.user);
  }

  @Patch('notifications/preferences')
  // Permissions are handled by ensureTenantAccess helper
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update notification preferences',
    description: 'Update which notification channels are enabled for the tenant'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification preferences updated successfully' 
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async updateNotificationPreferences(
    @Req() req, 
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    this.ensureTenantAccess(req.user);
    return this.tenantPortalService.updateNotificationPreferences(req.user, dto);
  }
}

