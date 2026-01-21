import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { Permissions } from '../rbac/permissions.decorator';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('tenants')
  @Permissions('tenants.read')
  @ApiOperation({ summary: 'Export tenants to CSV' })
  async exportTenants(@Res() res: Response) {
    const csv = await this.exportsService.exportTenantsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tenants-${Date.now()}.csv`);
    res.send(csv);
  }

  @Get('contracts')
  @Permissions('contracts.read')
  @ApiOperation({ summary: 'Export contracts to CSV' })
  @ApiQuery({ name: 'status', required: false })
  async exportContracts(@Res() res: Response, @Query('status') status?: string) {
    const csv = await this.exportsService.exportContractsCSV({ status });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contracts-${Date.now()}.csv`);
    res.send(csv);
  }

  @Get('invoices')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Export invoices to CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportInvoices(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.exportsService.exportInvoicesCSV({
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-${Date.now()}.csv`);
    res.send(csv);
  }

  @Get('payments')
  @Permissions('payments.read')
  @ApiOperation({ summary: 'Export payments to CSV' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportPayments(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.exportsService.exportPaymentsCSV({
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments-${Date.now()}.csv`);
    res.send(csv);
  }

  @Get('units')
  @Permissions('contracts.read')
  @ApiOperation({ summary: 'Export units to CSV' })
  async exportUnits(@Res() res: Response) {
    const csv = await this.exportsService.exportUnitsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=units-${Date.now()}.csv`);
    res.send(csv);
  }
}
