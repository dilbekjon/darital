import { Controller, Get, Req, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { AdminRole } from '@prisma/client'; // Import AdminRole
import { PrismaService } from '../prisma.service';

@ApiTags('Tenant Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@Controller('tenant/notifications')
export class TenantNotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get tenant's notification feed
   * Returns recent notifications for the authenticated tenant
   */
  @Get('feed')
  // No @Permissions decorator needed here as this is a tenant-specific endpoint
  @ApiOperation({ 
    summary: 'Get notification feed',
    description: 'Returns recent notifications (reminders, alerts) for the authenticated tenant'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification feed retrieved successfully',
    schema: {
      example: [
        {
          id: 'clx123456',
          tenantId: 'cm123',
          invoiceId: 'inv456',
          type: 'BEFORE_3_DAYS',
          title: 'Upcoming rent payment',
          body: 'Invoice cmh8evif...: Payment due in 3 days...',
          createdAt: '2025-10-28T10:00:00Z'
        }
      ]
    }
  })
  async getFeed(@Req() req) {
    // Resolve tenantId from authenticated user
    const tenantId = await this.resolveTenantId(req.user);

    // Fetch recent notifications (last 50)
    const items = await this.prisma.notificationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return items;
  }

  /**
   * Helper: Resolve tenantId from authenticated user
   * Reuses logic from tenant-portal.service.ts
   */
  private async resolveTenantId(user: any): Promise<string> {
    // Ensure the user is a TENANT_USER
    if (user.role !== AdminRole.TENANT_USER) {
      throw new ForbiddenException('Only tenant users can access this resource.');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { email: user.email },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found for this user');
    }

    return tenant.id;
  }
}

