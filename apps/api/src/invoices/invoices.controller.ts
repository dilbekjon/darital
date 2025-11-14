import { Controller, Get, Param, Post, Body, Query, UseGuards, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Updated import path
import { Permissions } from '../rbac/permissions.decorator'; // New import
import { InvoiceStatus } from '@prisma/client'; // Kept InvoiceStatus
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Removed RolesGuard, PermissionsGuard is global
@UseInterceptors(AuditInterceptor)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions('payments.read') // Admin permission to list invoices
  @ApiOperation({ summary: 'List invoices (payments.read for admin, tenant access via TenantPortal)', description: 'Filter by tenantId or status' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  async findAll(@Query('tenantId') tenantId?: string, @Query('status') status?: InvoiceStatus) {
    return this.invoicesService.findAll({ tenantId, status });
  }

  @Get(':id')
  @Permissions('payments.read') // Admin permission to get invoice by ID
  @ApiOperation({ summary: 'Get invoice by id with payments and contract (payments.read for admin, tenant access via TenantPortal)' })
  async findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Get(':id/qr')
  @Permissions('payments.read') // Admin permission to get QR code data for invoice
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
}


