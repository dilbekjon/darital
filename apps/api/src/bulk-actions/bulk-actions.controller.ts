import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { BulkActionsService } from './bulk-actions.service';

class BulkStatusDto {
  ids: string[];
  status: string;
}

class BulkNotificationDto {
  tenantIds: string[];
  type: string;
  title: string;
  message: string;
  data?: any;
}

class BulkAssignDto {
  unitIds: string[];
  buildingId: string | null;
}

@ApiTags('Bulk Actions')
@ApiBearerAuth()
@Controller('bulk')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BulkActionsController {
  constructor(private readonly bulkActionsService: BulkActionsService) {}

  @Post('invoices/status')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Bulk update invoice status' })
  async bulkUpdateInvoiceStatus(@Body() dto: BulkStatusDto) {
    return this.bulkActionsService.bulkUpdateInvoiceStatus(
      dto.ids,
      dto.status as 'PENDING' | 'PAID' | 'OVERDUE'
    );
  }

  @Post('payments/status')
  @Permissions('payments.capture_offline')
  @ApiOperation({ summary: 'Bulk update payment status' })
  async bulkUpdatePaymentStatus(@Body() dto: BulkStatusDto) {
    return this.bulkActionsService.bulkUpdatePaymentStatus(
      dto.ids,
      dto.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED'
    );
  }

  @Post('contracts/status')
  @Permissions('contracts.update')
  @ApiOperation({ summary: 'Bulk update contract status' })
  async bulkUpdateContractStatus(@Body() dto: BulkStatusDto) {
    return this.bulkActionsService.bulkUpdateContractStatus(
      dto.ids,
      dto.status as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
    );
  }

  @Post('units/status')
  @Permissions('contracts.update')
  @ApiOperation({ summary: 'Bulk update unit status' })
  async bulkUpdateUnitStatus(@Body() dto: BulkStatusDto) {
    return this.bulkActionsService.bulkUpdateUnitStatus(
      dto.ids,
      dto.status as 'FREE' | 'BUSY' | 'MAINTENANCE'
    );
  }

  @Post('units/assign-building')
  @Permissions('contracts.update')
  @ApiOperation({ summary: 'Bulk assign units to building' })
  async bulkAssignUnitsToBuilding(@Body() dto: BulkAssignDto) {
    return this.bulkActionsService.bulkAssignUnitsToBuilding(dto.unitIds, dto.buildingId);
  }

  @Post('notifications/send')
  @Permissions('notifications.manage')
  @ApiOperation({ summary: 'Bulk send notifications to tenants' })
  async bulkSendNotifications(@Body() dto: BulkNotificationDto) {
    return this.bulkActionsService.bulkCreateNotifications(dto.tenantIds, {
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    });
  }
}
