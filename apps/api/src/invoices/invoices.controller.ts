import { Controller, Delete, Get, Param, Patch, Post, Put, Body, Query, Req, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { InvoiceStatus } from '@prisma/client'; // Kept InvoiceStatus
import { AuditInterceptor } from '../audit/audit.interceptor';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@UseInterceptors(AuditInterceptor)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'List invoices (invoices.read for admin, tenant access via TenantPortal)', description: 'Filter by tenantId or status' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  async findAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  @Permissions('invoices.read')
  @ApiOperation({ summary: 'Get invoice by id with payments and contract (invoices.read for admin, tenant access via TenantPortal)' })
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/qr')
  @Permissions('invoices.read')
  @ApiOperation({ 
    summary: 'Get QR code data for invoice payment (payments.read for admin, tenant access via TenantPortal)',
    description: 'Returns QR string for payment providers and current payment status' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'QR code data returned',
    schema: {
      example: {
        invoiceId: 'clx123456',
        amount: 1200000,
        qrString: 'payme://payment?invoice_id=clx123456&amount=1200000',
        paid: false,
        status: 'PENDING'
      }
    }
  })
  async getQrCode(@Param('id') id: string) {
    return this.invoicesService.generateQrCode(id);
  }

  @Post()
  @Permissions('contracts.update') // Permission for creating invoices (related to contracts)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Create invoice for a contract (contracts.update)' })
  @ApiResponse({ status: 201, description: 'Invoice created with PENDING status' })
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Patch(':id')
  @Permissions('contracts.update')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ 
    summary: 'Update invoice',
    description: 'Update invoice details. Cannot edit paid invoices or change amount of invoices with confirmed payments.'
  })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Cannot edit paid invoice or change amount with confirmed payments' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Put(':id/archive')
  @Permissions('contracts.update')
  @ApiOperation({
    summary: 'Archive invoice',
    description: 'Move invoice to archive (soft delete). Accessible by: ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Invoice archived successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async archive(@Param('id') id: string, @Body() body: { reason?: string }, @Req() req) {
    const adminId = req.user.id;
    return this.invoicesService.archive(id, adminId, body.reason);
  }

  @Put(':id/unarchive')
  @Permissions('contracts.update')
  @ApiOperation({
    summary: 'Unarchive invoice',
    description: 'Restore invoice from archive. Accessible by: ADMIN, SUPER_ADMIN only'
  })
  @ApiResponse({ status: 200, description: 'Invoice unarchived successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async unarchive(@Param('id') id: string) {
    return this.invoicesService.unarchive(id);
  }

  @Delete(':id')
  @Permissions('contracts.update')
  @ApiOperation({
    summary: 'Permanently delete invoice',
    description: 'Permanently delete archived invoice. Accessible by: ADMIN, SUPER_ADMIN only. Can only delete archived invoices.'
  })
  @ApiResponse({ status: 200, description: 'Invoice permanently deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete non-archived invoice' })
  async remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}


