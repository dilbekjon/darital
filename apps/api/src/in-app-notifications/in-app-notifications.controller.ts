import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InAppNotificationsService } from './in-app-notifications.service';
import { AdminRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('In-App Notifications')
@ApiBearerAuth()
@Controller('tenant/notifications')
@UseGuards(JwtAuthGuard)
export class InAppNotificationsController {
  constructor(private readonly notificationsService: InAppNotificationsService) {}

  private ensureTenantAccess(user: any) {
    if (user.role !== AdminRole.TENANT_USER) {
      throw new ForbiddenException('Access denied');
    }
  }

  @Get('in-app')
  @ApiOperation({ summary: 'Get in-app notifications for tenant' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    this.ensureTenantAccess(req.user);
    return this.notificationsService.getForTenant(req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('in-app/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    this.ensureTenantAccess(req.user);
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post('in-app/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    this.ensureTenantAccess(req.user);
    await this.notificationsService.markAsRead(id, req.user.id);
    return { success: true };
  }

  @Post('in-app/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: any) {
    this.ensureTenantAccess(req.user);
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Delete('in-app/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Req() req: any, @Param('id') id: string) {
    this.ensureTenantAccess(req.user);
    await this.notificationsService.delete(id, req.user.id);
    return { success: true };
  }
}
