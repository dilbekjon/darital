import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BalancesService } from './balances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { LedgerService } from '../ledger/ledger.service';
import { BalanceChargeService } from '../ledger/balance-charge.service';
import { serializeLedgerEntries } from '../ledger/ledger.serializer';

@ApiTags('balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@Controller('balances')
export class BalancesController {
  constructor(
    private readonly balancesService: BalancesService,
    private readonly ledger: LedgerService,
    private readonly balanceCharge: BalanceChargeService,
  ) {}

  @Get()
  @Permissions('payments.read') // Admin overview of all tenant balances
  @ApiOperation({ summary: 'Admin overview of all tenant balances (payments.read)' })
  async findAll() {
    return this.balancesService.findAll();
  }

  @Post('run-charges')
  @Permissions('payments.capture_offline')
  @ApiOperation({ summary: 'Manually run due rent/utility balance charges (testing/ops)' })
  async runCharges() {
    return this.balanceCharge.runCharges();
  }

  @Get(':tenantId')
  @Permissions('payments.read') // Admin view of a specific tenant's balance, tenant access handled by TenantPortal
  @ApiOperation({ summary: 'Get tenant balance by tenantId (payments.read for admin, tenant access via TenantPortal)' })
  async findOne(@Param('tenantId') tenantId: string) {
    return this.balancesService.findOne(tenantId);
  }

  @Get(':tenantId/ledger')
  @Permissions('payments.read')
  @ApiOperation({ summary: "Tenant balance history (ledger of every change with reasons)" })
  async ledgerHistory(@Param('tenantId') tenantId: string) {
    const [balance, entries] = await Promise.all([
      this.ledger.getBalance(tenantId),
      this.ledger.getHistory(tenantId),
    ]);
    return { current: balance.toNumber(), entries: serializeLedgerEntries(entries) };
  }

  @Post(':tenantId/adjust')
  @Permissions('payments.capture_offline')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Manually adjust tenant balance with a reason (records a ledger entry)' })
  async adjust(@Param('tenantId') tenantId: string, @Body() body: AdjustBalanceDto, @Req() req: any) {
    await this.ledger.post({
      tenantId,
      type: 'ADJUSTMENT',
      amount: body.amount, // signed string
      description: body.reason,
      createdBy: req.user?.id ?? null,
    });
    const balance = await this.ledger.getBalance(tenantId);
    return { current: balance.toNumber() };
  }

  @Patch(':tenantId/reset')
  @Permissions('payments.capture_offline') // Permission to reset/adjust balance
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Admin resets/adjusts tenant balance (payments.capture_offline)' })
  async reset(@Param('tenantId') tenantId: string, @Body() body: UpdateBalanceDto) {
    return this.balancesService.reset(tenantId, body.current);
  }
}
