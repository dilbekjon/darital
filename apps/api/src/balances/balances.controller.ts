import { Body, Controller, Get, Param, Patch, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalancesService } from './balances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { UpdateBalanceDto } from './dto/update-balance.dto';

@ApiTags('balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  @Permissions('payments.read') // Admin overview of all tenant balances
  @ApiOperation({ summary: 'Admin overview of all tenant balances (payments.read)' })
  async findAll() {
    return this.balancesService.findAll();
  }

  @Get(':tenantId')
  @Permissions('payments.read') // Admin view of a specific tenant's balance, tenant access handled by TenantPortal
  @ApiOperation({ summary: 'Get tenant balance by tenantId (payments.read for admin, tenant access via TenantPortal)' })
  async findOne(@Param('tenantId') tenantId: string) {
    return this.balancesService.findOne(tenantId);
  }

  @Patch(':tenantId/reset')
  @Permissions('payments.capture_offline') // Permission to reset/adjust balance
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Admin resets/adjusts tenant balance (payments.capture_offline)' })
  async reset(@Param('tenantId') tenantId: string, @Body() body: UpdateBalanceDto) {
    return this.balancesService.reset(tenantId, body.current);
  }
}


